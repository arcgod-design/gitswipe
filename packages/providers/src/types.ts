export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
  embeddings: boolean;
}

export interface ModelInfo {
  id: string;
  displayName?: string;
  contextLength?: number;
}

export interface HealthStatus {
  ok: boolean;
  detail: string;
  latencyMs?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ChatResponse {
  model: string;
  content: string;
  usage?: TokenUsage;
}

export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "usage"; usage: TokenUsage }
  | { type: "error"; message: string };

export interface StructuredRequest<T> {
  schemaName: string;
  schemaJson: Record<string, unknown>;
  parse: (raw: string) => T;
}

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;
  capabilities(): ProviderCapabilities;
  listModels(): Promise<ModelInfo[]>;
  healthCheck(model?: string): Promise<HealthStatus>;
  chat(req: ChatRequest): Promise<ChatResponse>;
  stream(req: ChatRequest): AsyncIterable<ChatEvent>;
  structuredOutput<T>(req: ChatRequest, structured: StructuredRequest<T>): Promise<T>;
}
