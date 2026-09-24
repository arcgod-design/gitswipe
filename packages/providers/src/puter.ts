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
import { ProviderError } from "./provider-error.js";

export interface PuterChatLike {
  chat(messages: unknown, options?: Record<string, unknown>): Promise<string | AsyncIterable<string>>;
}

export interface PuterOptions {
  puter: PuterChatLike;
  defaultModel?: string;
}

export class PuterClientProvider implements AIProvider {
  readonly id = "puter";
  readonly displayName = "Puter (user-pays)";
  private readonly puter: PuterChatLike;
  private readonly defaultModel: string | undefined;

  constructor(opts: PuterOptions) {
    this.puter = opts.puter;
    this.defaultModel = opts.defaultModel;
  }

  capabilities(): ProviderCapabilities {
    return { chat: true, streaming: false, structuredOutput: false, toolCalling: false, embeddings: false };
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const result = await this.puter.chat(req.messages, { model: req.model });
    if (typeof result !== "string") {
      throw new ProviderError("PROVIDER_FAILURE", "puter: non-streaming chat returned a stream");
    }
    return { model: req.model, content: result };
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
    const result = await this.puter.chat(req.messages, { model: req.model, stream: true });
    if (typeof result === "string") {
      yield { type: "text", delta: result };
      return;
    }
    for await (const chunk of result) {
      if (typeof chunk === "string" && chunk.length > 0) {
        yield { type: "text", delta: chunk };
      }
    }
  }

  async structuredOutput<T>(_req: ChatRequest, _structured: StructuredRequest<T>): Promise<T> {
    throw new ProviderError("PROVIDER_FAILURE", "puter bridge does not support structured output");
  }

  async listModels(): Promise<ModelInfo[]> {
    throw new ProviderError("PROVIDER_FAILURE", "puter bridge does not expose model listing");
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      ok: true,
      detail: this.defaultModel
        ? `client-side bridge ready (model ${this.defaultModel}); live only inside puter.js runtime`
        : "client-side bridge ready; live only inside puter.js runtime",
    };
  }
}
