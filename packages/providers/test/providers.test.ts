import { afterEach, describe, expect, it } from "vitest";
import { createProvider, PROVIDER_PRESETS } from "../src/registry.js";
import { OpenAICompatibleProvider } from "../src/openai-compatible.js";
import { AnthropicProvider } from "../src/anthropic.js";
import { ProviderError } from "../src/provider-error.js";
import type { Server } from "node:http";
import { createServer } from "node:http";

let server: Server | null = null;
let baseUrl = "";
let requests: Array<{ method: string; url: string; headers: Record<string, string>; body: any }> = [];

async function startMock(handler: (req: any, res: any, body: any) => void): Promise<void> {
  requests = [];
  server = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => {
      let parsed: unknown = null;
      try {
        parsed = data ? JSON.parse(data) : null;
      } catch {
        parsed = data;
      }
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        headers: req.headers as Record<string, string>,
        body: parsed,
      });
      handler({ ...req, parsedBody: parsed }, res, parsed);
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

function openaiMock(provider = new OpenAICompatibleProvider({ id: "test", displayName: "Test", baseUrl: "http://placeholder" })) {
  return provider;
}

describe("openai-compatible provider", () => {
  it("chat sends auth header + parses content and usage", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "cmpl-1",
          model: "gpt-test",
          choices: [{ message: { content: "hello world" } }],
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        }),
      );
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "Test", baseUrl, apiKey: "sk-test" });
    const result = await provider.chat({ model: "gpt-test", messages: [{ role: "user", content: "hi" }] });
    expect(result.content).toBe("hello world");
    expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
    expect(requests[0]?.headers.authorization).toBe("Bearer sk-test");
    expect(requests[0]?.body.stream).toBe(false);
  });

  it("stream yields text deltas until [DONE]", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "hel" } }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "lo" } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "Test", baseUrl });
    const chunks: string[] = [];
    for await (const evt of provider.stream({ model: "m", messages: [{ role: "user", content: "hi" }] })) {
      if (evt.type === "text") chunks.push(evt.delta);
    }
    expect(chunks.join("")).toBe("hello");
  });

  it("maps 401 to AUTH_FAILURE and does not leak the key into the error", async () => {
    await startMock((_req, res) => {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad key" }));
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "Test", baseUrl, apiKey: "sk-secret" });
    await expect(provider.chat({ model: "m", messages: [] })).rejects.toThrow(ProviderError);
    await expect(provider.chat({ model: "m", messages: [] })).rejects.toThrow(/\[AUTH_FAILURE\]/);
  });

  it("retries once on 429 then succeeds", async () => {
    let calls = 0;
    await startMock((_req, res) => {
      calls += 1;
      if (calls === 1) {
        res.writeHead(429);
        res.end("{}");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "after retry" } }] }));
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "Test", baseUrl });
    const result = await provider.chat({ model: "m", messages: [] });
    expect(result.content).toBe("after retry");
    expect(calls).toBe(2);
  });

  it("healthCheck reports ok + latency for reachable servers", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "m1" }] }));
    });
    const provider = new OpenAICompatibleProvider({ id: "test", displayName: "Test", baseUrl });
    const health = await provider.healthCheck();
    expect(health.ok).toBe(true);
    expect(typeof health.latencyMs).toBe("number");
    const models = await provider.listModels();
    expect(models).toEqual([{ id: "m1" }]);
  });
});

describe("anthropic provider", () => {
  it("chat sends x-api-key + anthropic-version and extracts text blocks", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: "claude-test",
          content: [{ type: "text", text: "hello from claude" }],
          usage: { input_tokens: 3, output_tokens: 4 },
        }),
      );
    });
    const provider = new AnthropicProvider({ apiKey: "ak-test", baseUrl });
    const result = await provider.chat({ model: "claude-test", messages: [{ role: "user", content: "hi" }] });
    expect(result.content).toBe("hello from claude");
    expect(requests[0]?.headers["x-api-key"]).toBe("ak-test");
    expect(requests[0]?.headers["anthropic-version"]).toBe("2023-06-01");
    expect(requests[0]?.body.max_tokens).toBe(4096);
  });

  it("stream maps content_block_delta events", async () => {
    await startMock((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({ type: "content_block_delta", delta: { text: "he" } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "content_block_delta", delta: { text: "y" } })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });
    const provider = new AnthropicProvider({ apiKey: "ak", baseUrl });
    const chunks: string[] = [];
    for await (const evt of provider.stream({ model: "m", messages: [] })) {
      if (evt.type === "text") chunks.push(evt.delta);
    }
    expect(chunks.join("")).toBe("hey");
  });
});

describe("registry", () => {
  it("ollama preset targets the local endpoint", () => {
    const p = createProvider({ providerId: "ollama" });
    expect(p.displayName).toBe(PROVIDER_PRESETS.ollama!.displayName);
  });

  it("generic provider requires a baseUrl", () => {
    expect(() => createProvider({ providerId: "generic" })).toThrow(ProviderError);
  });

  it("puter is rejected on the workstation by design", () => {
    expect(() => createProvider({ providerId: "puter" })).toThrow(/client-side bridge/);
  });

  it("anthropic requires a key", () => {
    expect(() => createProvider({ providerId: "anthropic" })).toThrow(/requires an API key/);
  });
});

describe("model routing (contract §7.2)", () => {
  it("user overrides win; fallback covers the rest", async () => {
    const { resolveRoute } = await import("../src/routing.js");
    const overrides = { repositoryAnalysis: { providerId: "anthropic", model: "claude-strong" } };
    const fallback = { providerId: "openai", model: "gpt-cheap" };
    expect(resolveRoute("repositoryAnalysis", overrides, fallback)).toEqual({
      providerId: "anthropic",
      model: "claude-strong",
    });
    expect(resolveRoute("embeddings", overrides, fallback)).toEqual(fallback);
  });
});
