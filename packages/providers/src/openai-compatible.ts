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
import { expectOk, ProviderError, withTimeout } from "./provider-error.js";

export interface OpenAICompatibleOptions {
  id: string;
  displayName: string;
  baseUrl: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

interface OpenAIChatChoice {
  message?: { content?: string | null };
  delta?: { content?: string | null };
  finish_reason?: string | null;
}

interface OpenAIChatBody {
  id?: string;
  model?: string;
  choices?: OpenAIChatChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const RETRYABLE = new Set([429, 502, 503]);

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  readonly displayName: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly headers: Record<string, string>;
  private readonly doFetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(opts: OpenAICompatibleOptions) {
    this.id = opts.id;
    this.displayName = opts.displayName;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.headers = opts.defaultHeaders ?? {};
    this.doFetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  capabilities(): ProviderCapabilities {
    return { chat: true, streaming: true, structuredOutput: true, toolCalling: true, embeddings: false };
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await this.doFetch(`${this.baseUrl}/models`, {
      headers: this.authHeaders(),
      signal: withTimeout(undefined, 15_000),
    });
    await expectOk(res, `${this.id}: listModels`);
    const body = (await res.json()) as { data?: Array<{ id: string }> };
    return (body.data ?? []).map((m) => ({ id: m.id }));
  }

  async healthCheck(_model?: string): Promise<HealthStatus> {
    const started = Date.now();
    try {
      const res = await this.doFetch(`${this.baseUrl}/models`, {
        headers: this.authHeaders(),
        signal: withTimeout(undefined, 5_000),
      });
      if (!res.ok) {
        return { ok: false, detail: `HTTP ${res.status}`, latencyMs: Date.now() - started };
      }
      return { ok: true, detail: "models endpoint reachable", latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "unreachable" };
    }
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const body = {
      model: req.model,
      messages: req.messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      stream: false,
    };
    let res = await this.post(body, req.signal, false);
    if (RETRYABLE.has(res.status)) {
      await sleep(1_000);
      res = await this.post(body, req.signal, false);
    }
    await expectOk(res, `${this.id}: chat`);
    const parsed = (await res.json()) as OpenAIChatBody;
    const content = parsed.choices?.[0]?.message?.content ?? "";
    return {
      model: parsed.model ?? req.model,
      content,
      usage: parsed.usage
        ? { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens }
        : undefined,
    };
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
    const res = await this.post(
      { model: req.model, messages: req.messages, max_tokens: req.maxTokens, temperature: req.temperature, stream: true },
      req.signal,
      true,
    );
    await expectOk(res, `${this.id}: stream`);
    yield* parseSse(res, (payload) => {
      const parsed = JSON.parse(payload) as OpenAIChatBody;
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) return { type: "text" as const, delta };
      return null;
    });
  }

  async structuredOutput<T>(req: ChatRequest, structured: StructuredRequest<T>): Promise<T> {
    const res = await this.post(
      {
        model: req.model,
        messages: req.messages,
        max_tokens: req.maxTokens,
        temperature: req.temperature,
        stream: false,
        response_format: { type: "json_object" },
      },
      req.signal,
      false,
    );
    await expectOk(res, `${this.id}: structuredOutput`);
    const parsed = (await res.json()) as OpenAIChatBody;
    const raw = parsed.choices?.[0]?.message?.content ?? "";
    try {
      return structured.parse(raw);
    } catch {
      throw new ProviderError("PROVIDER_FAILURE", `${this.id}: structured output failed schema validation`);
    }
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}`, ...this.headers } : { ...this.headers };
  }

  private post(
    body: Record<string, unknown>,
    signal: AbortSignal | undefined,
    longRunning: boolean,
  ): Promise<Response> {
    return this.doFetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify(body),
      signal: withTimeout(signal, longRunning ? this.timeoutMs : 30_000),
    });
  }
}

export async function* parseSse<T extends ChatEvent>(
  res: Response,
  mapPayload: (payload: string) => T | null,
): AsyncIterable<ChatEvent> {
  const reader = res.body?.getReader();
  if (!reader) throw new ProviderError("PROVIDER_FAILURE", "no response body to stream");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      const event = mapPayload(payload);
      if (event) yield event;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
