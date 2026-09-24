import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { ModelRouter, DEFAULT_ROUTE_FALLBACKS, type RouteFallbacks } from "../src/router.js";
import { chatWithFailover } from "../src/failover.js";
import { OpenAICompatibleProvider } from "../src/openai-compatible.js";
import { ProviderError } from "../src/provider-error.js";
import type { AIProvider, ChatRequest } from "../src/types.js";
import type { RouteOverrides } from "../src/routing.js";

class NoEmbeddingsProvider implements AIProvider {
  readonly id = "noembed";
  readonly displayName = "NoEmbeddings";
  capabilities() {
    return { chat: true, streaming: true, structuredOutput: true, toolCalling: true, embeddings: false };
  }
  async listModels() {
    return [];
  }
  async healthCheck() {
    return { ok: true, detail: "fake" };
  }
  async chat(_req: ChatRequest) {
    return { model: "m", content: "ok" };
  }
  async *_stream(): AsyncIterable<{ type: "text"; delta: string }> {
    yield { type: "text", delta: "ok" };
  }
  stream(): AsyncIterable<{ type: "text"; delta: string }> {
    return this._stream();
  }
  async structuredOutput<T>(_req: ChatRequest, _s: { parse: (raw: string) => T }): Promise<T> {
    throw new ProviderError("PROVIDER_FAILURE", "not supported");
  }
}

let servers: Server[] = [];

async function mockProvider(
  id: string,
  behavior: "ok" | "http500" | "auth401" | "netdown",
): Promise<OpenAICompatibleProvider> {
  if (behavior === "ok" || behavior === "http500" || behavior === "auth401") {
    const server = createServer((_req, res) => {
      if (behavior === "http500") {
        res.writeHead(500);
        res.end("{}");
        return;
      }
      if (behavior === "auth401") {
        res.writeHead(401);
        res.end("{}");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ model: "m", choices: [{ message: { content: `answer from ${id}` } }] }));
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        resolve(addr && typeof addr === "object" ? addr.port : 0);
      });
    });
    servers.push(server);
    return new OpenAICompatibleProvider({ id, displayName: id, baseUrl: `http://127.0.0.1:${port}` });
  }
  return new OpenAICompatibleProvider({
    id,
    displayName: id,
    baseUrl: "http://127.0.0.1:1",
    timeoutMs: 500,
  });
}

afterEach(async () => {
  for (const s of servers) {
    s.closeAllConnections();
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  servers = [];
});

const fallbacks: RouteFallbacks = {
  ...DEFAULT_ROUTE_FALLBACKS,
  repositoryAnalysis: { providerId: "primary", model: "m" },
};

describe("ModelRouter", () => {
  it("user overrides win over fallbacks", async () => {
    const primary = await mockProvider("primary", "ok");
    const alt = await mockProvider("alt", "ok");
    const router = new ModelRouter(
      new Map<string, AIProvider>([
        ["primary", primary],
        ["alt", alt],
      ]),
      { repositoryAnalysis: { providerId: "alt", model: "strong-model" } },
      fallbacks,
    );
    const route = router.resolve("repositoryAnalysis");
    expect(route.provider.id).toBe("alt");
    expect(route.model).toBe("strong-model");
  });

  it("unconfigured provider in a route is a PROVIDER_FAILURE, never silent", () => {
    const router = new ModelRouter(new Map<string, AIProvider>(), {}, fallbacks);
    expect(() => router.resolve("repositoryAnalysis")).toThrow(/\[PROVIDER_FAILURE\]/);
  });

  it("embeddings route enforces capability (contract s141)", () => {
    const router = new ModelRouter(
      new Map<string, AIProvider>([["noembed", new NoEmbeddingsProvider()]]),
      { embeddings: { providerId: "noembed", model: "m" } },
      fallbacks,
    );
    expect(() => router.resolveEmbeddings({ input: "x" })).toThrow(/does not support embeddings/);
  });

  it("authorizedChain keeps primary first, adds only user-authorized failovers, rejects unauthorized primary", async () => {
    const primary = await mockProvider("primary", "ok");
    const alt = await mockProvider("alt", "ok");
    const stranger = await mockProvider("stranger", "ok");
    const router = new ModelRouter(
      new Map<string, AIProvider>([
        ["primary", primary],
        ["alt", alt],
        ["stranger", stranger],
      ]),
      {},
      fallbacks,
    );
    const chain = router.authorizedChain("repositoryAnalysis", ["primary", "alt"]);
    expect(chain.map((c) => c.provider.id)).toEqual(["primary", "alt"]);

    expect(() => router.authorizedChain("repositoryAnalysis", ["alt", "stranger"])).toThrow(/not user-authorized/);
  });
});

describe("chatWithFailover (contract s110 - authorized only, never silent)", () => {
  const req = { model: "ignored", messages: [{ role: "user" as const, content: "hi" }] };

  it("fails over on PROVIDER_FAILURE within the authorized chain", async () => {
    const primary = await mockProvider("primary", "http500");
    const alt = await mockProvider("alt", "ok");
    const router = new ModelRouter(
      new Map<string, AIProvider>([
        ["primary", primary],
        ["alt", alt],
      ]),
      {},
      fallbacks,
    );
    const chain = router.authorizedChain("repositoryAnalysis", ["primary", "alt"]);
    const outcome = await chatWithFailover(chain, req);
    expect(outcome.response.content).toBe("answer from alt");
    expect(outcome.providerId).toBe("alt");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]?.providerId).toBe("primary");
    expect(outcome.attempts[0]?.error).toContain("HTTP 500");
  });

  it("AUTH_FAILURE never fails over - a bad key must surface, not hide", async () => {
    const primary = await mockProvider("primary", "auth401");
    const alt = await mockProvider("alt", "ok");
    const router = new ModelRouter(
      new Map<string, AIProvider>([
        ["primary", primary],
        ["alt", alt],
      ]),
      {},
      fallbacks,
    );
    const chain = router.authorizedChain("repositoryAnalysis", ["primary", "alt"]);
    await expect(chatWithFailover(chain, req)).rejects.toThrow(/\[AUTH_FAILURE\]/);
  });

  it("network-level errors (non-ProviderError) fail over too", async () => {
    const primary = await mockProvider("primary", "netdown");
    const alt = await mockProvider("alt", "ok");
    const router = new ModelRouter(
      new Map<string, AIProvider>([
        ["primary", primary],
        ["alt", alt],
      ]),
      {},
      fallbacks,
    );
    const chain = router.authorizedChain("repositoryAnalysis", ["primary", "alt"]);
    const outcome = await chatWithFailover(chain, req);
    expect(outcome.providerId).toBe("alt");
  });

  it("all-authorized-fail -> PROVIDER_FAILURE listing every attempt", async () => {
    const primary = await mockProvider("primary", "http500");
    const alt = await mockProvider("alt", "http500");
    const router = new ModelRouter(
      new Map<string, AIProvider>([
        ["primary", primary],
        ["alt", alt],
      ]),
      {},
      fallbacks,
    );
    const chain = router.authorizedChain("repositoryAnalysis", ["primary", "alt"]);
    const err = await chatWithFailover(chain, req).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as Error).message).toMatch(/all 2 authorized providers failed/);
    expect((err as Error).message).toContain("primary");
    expect((err as Error).message).toContain("alt");
  });
});
