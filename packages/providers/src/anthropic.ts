import type {
  AIProvider,
  ChatEvent,
  ChatRequest,
  ChatResponse,
  HealthStatus,
  ModelInfo,
  ProviderCapabilities,
  StructuredRequest,
} from "./types.js";
import { expectOk, fetchOrThrow, ProviderError, withTimeout } from "./provider-error.js";
import { parseSse } from "./openai-compatible.js";

export interface AnthropicOptions {
  apiKey: string;
  baseUrl?: string;
  version?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

interface AnthropicBody {
  id?: string;
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  delta?: { text?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly displayName = "Anthropic";
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly version: string;
  private readonly doFetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(opts: AnthropicOptions) {
    this.baseUrl = (opts.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.version = opts.version ?? "2023-06-01";
    this.doFetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  capabilities(): ProviderCapabilities {
    return { chat: true, streaming: true, structuredOutput: true, toolCalling: true, embeddings: false };
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetchOrThrow(
      () =>
        this.doFetch(`${this.baseUrl}/models`, {
          headers: this.headers(),
          signal: withTimeout(undefined, 15_000),
        }),
      "anthropic",
    );
    await expectOk(res, "anthropic: listModels");
    const body = (await res.json()) as { data?: Array<{ id: string; display_name?: string }> };
    return (body.data ?? []).map((m) => ({ id: m.id, displayName: m.display_name }));
  }

  async healthCheck(_model?: string): Promise<HealthStatus> {
    const started = Date.now();
    try {
      const res = await this.doFetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
        signal: withTimeout(undefined, 5_000),
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}`, latencyMs: Date.now() - started };
      return { ok: true, detail: "models endpoint reachable", latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "unreachable" };
    }
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const res = await this.post(
      {
        model: req.model,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature,
        system: system || undefined,
        messages: req.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      },
      req.signal,
    );
    await expectOk(res, "anthropic: chat");
    const parsed = (await res.json()) as AnthropicBody;
    const content = (parsed.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
    return {
      model: parsed.model ?? req.model,
      content,
      usage: parsed.usage
        ? { inputTokens: parsed.usage.input_tokens, outputTokens: parsed.usage.output_tokens }
        : undefined,
    };
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const res = await this.post(
      {
        model: req.model,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature,
        system: system || undefined,
        messages: req.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      },
      req.signal,
    );
    await expectOk(res, "anthropic: stream");
    yield* parseSse(res, (payload) => {
      const parsed = JSON.parse(payload) as AnthropicBody & { type?: string };
      if (parsed.type === "content_block_delta" && typeof parsed.delta?.text === "string") {
        return { type: "text" as const, delta: parsed.delta.text };
      }
      return null;
    });
  }

  async structuredOutput<T>(req: ChatRequest, structured: StructuredRequest<T>): Promise<T> {
    const instruction = (strict: boolean) =>
      strict
        ? `Output ONLY a valid JSON value matching: ${JSON.stringify(structured.schemaJson)}. No markdown fences, no prose, no extra keys.`
        : `Reply with a single JSON object matching: ${JSON.stringify(structured.schemaJson)}. No prose.`;
    const first = await this.chat({
      ...req,
      messages: [...req.messages, { role: "system", content: instruction(false) }],
    });
    try {
      return structured.parse(first.content);
    } catch {
      const retry = await this.chat({
        ...req,
        messages: [...req.messages, { role: "system", content: instruction(true) }],
      });
      try {
        return structured.parse(retry.content);
      } catch {
        throw new ProviderError("PROVIDER_FAILURE", "anthropic: structured output failed schema validation after retry");
      }
    }
  }

  private headers(): Record<string, string> {
    return { "x-api-key": this.apiKey, "anthropic-version": this.version, "Content-Type": "application/json" };
  }

  private post(body: Record<string, unknown>, signal: AbortSignal | undefined): Promise<Response> {
    return fetchOrThrow(
      () =>
        this.doFetch(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: withTimeout(signal, this.timeoutMs),
        }),
      "anthropic",
    );
  }
}
