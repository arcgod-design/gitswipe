import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { OpenAICompatibleProvider } from "../src/openai-compatible.js";
import { AnthropicProvider } from "../src/anthropic.js";

let server: Server | null = null;
let baseUrl = "";
let requestCount = 0;

async function startMock(handler: (req: any, res: any) => void): Promise<void> {
  requestCount = 0;
  server = createServer((req, res) => {
    requestCount += 1;
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => {
      try {
        JSON.parse(data);
      } catch {
        /* stream handlers may not send JSON */
      }
      handler(req, res);
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (addr && typeof addr === "object") baseUrl = `http://127.0.0.1:${addr.port}`;
}

afterEach(() => {
  if (server) {
    server.closeAllConnections();
    server.close();
    server = null;
  }
});

describe("embeddings (openai-compatible)", () => {
  it("sorts embedding results by index", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: "text-embed-test",
          data: [
            { index: 1, embedding: [0.4, 0.5] },
            { index: 0, embedding: [0.1, 0.2] },
          ],
        }),
      );
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "T", baseUrl });
    const result = await provider.embeddings!({ model: "text-embed-test", input: ["a", "b"] });
    expect(result.embeddings).toEqual([
      [0.1, 0.2],
      [0.4, 0.5],
    ]);
    expect(result.model).toBe("text-embed-test");
    expect(provider.capabilities().embeddings).toBe(true);
  });

  it("maps embeddings errors to PROVIDER_FAILURE", async () => {
    await startMock((_req, res) => {
      res.writeHead(500);
      res.end("{}");
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "T", baseUrl });
    await expect(provider.embeddings!({ model: "m", input: "x" })).rejects.toThrow(/\[PROVIDER_FAILURE\]/);
  });

  it("anthropic does not advertise embeddings", () => {
    const provider = new AnthropicProvider({ apiKey: "ak" });
    expect(provider.capabilities().embeddings).toBe(false);
    expect(provider.embeddings).toBeUndefined();
  });
});

describe("structured output retry (contract §142)", () => {
  it("retries once with a stricter prompt when the first output fails the schema", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      const body =
        requestCount === 1
          ? { choices: [{ message: { content: "not json at all" } }] }
          : { choices: [{ message: { content: '{"votes": 3}' } }] };
      res.end(JSON.stringify(body));
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "T", baseUrl });
    const result = await provider.structuredOutput(
      { model: "m", messages: [] },
      {
        schemaName: "votes",
        schemaJson: { type: "object", properties: { votes: { type: "number" } } },
        parse: (raw) => {
          const parsed = JSON.parse(raw) as { votes: number };
          return parsed;
        },
      },
    );
    expect(result.votes).toBe(3);
    expect(requestCount).toBe(2);
  });

  it("throws after the retry also fails", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "still not json" } }] }));
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "T", baseUrl });
    await expect(
      provider.structuredOutput({ model: "m", messages: [] }, {
        schemaName: "x",
        schemaJson: {},
        parse: (raw) => JSON.parse(raw) as object,
      }),
    ).rejects.toThrow(/failed schema validation after retry/);
    expect(requestCount).toBe(2);
  });
});

describe("timeout + malformed stream robustness (WEEK-01 exit test)", () => {
  it("a hanging endpoint surfaces as [TIMEOUT]", async () => {
    const hanging = createServer((_req, res) => {
      /* never responds */
    });
    await new Promise<void>((resolve) => hanging.listen(0, "127.0.0.1", resolve));
    const addr = hanging.address();
    const port = addr && typeof addr === "object" ? addr.port : 0;
    try {
      const provider = new OpenAICompatibleProvider({
        id: "slow",
        displayName: "Slow",
        baseUrl: `http://127.0.0.1:${port}`,
        timeoutMs: 150,
      });
      await expect(provider.chat({ model: "m", messages: [] })).rejects.toThrow(/\[TIMEOUT\]/);
    } finally {
      hanging.closeAllConnections();
      await new Promise<void>((resolve) => hanging.close(() => resolve()));
    }
  });

  it("skips malformed SSE lines and still delivers valid deltas", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(": keep-alive comment\n\n");
      res.write("data: {this is not json\n\n");
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "ok" } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "T", baseUrl });
    const chunks: string[] = [];
    for await (const evt of provider.stream({ model: "m", messages: [] })) {
      if (evt.type === "text") chunks.push(evt.delta);
    }
    expect(chunks.join("")).toBe("ok");
  });

  it("connection-refused surfaces as [NETWORK_FAILURE]", async () => {
    const provider = new OpenAICompatibleProvider({
      id: "dead",
      displayName: "Dead",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(provider.chat({ model: "m", messages: [] })).rejects.toThrow(/\[NETWORK_FAILURE\]/);
  });
});
