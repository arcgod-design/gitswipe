import type { AIProvider } from "./types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import { ProviderError } from "./provider-error.js";

export interface ProviderConfig {
  providerId: string;
  apiKey?: string;
  baseUrl?: string;
  ollamaBaseUrl?: string;
}

export const PROVIDER_PRESETS: Record<string, { baseUrl: string; displayName: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", displayName: "OpenAI" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", displayName: "OpenRouter" },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    displayName: "Google Gemini (OpenAI-compatible)",
  },
  ollama: { baseUrl: "http://127.0.0.1:11434/v1", displayName: "Ollama (local)" },
};

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.providerId) {
    case "anthropic": {
      if (!config.apiKey) throw new ProviderError("AUTH_FAILURE", "anthropic requires an API key");
      return new AnthropicProvider({ apiKey: config.apiKey, baseUrl: config.baseUrl });
    }
    case "puter":
      throw new ProviderError(
        "PROVIDER_FAILURE",
        "puter is a client-side bridge (apps/web); it cannot be created on the workstation",
      );
    case "openai":
    case "openrouter":
    case "gemini":
    case "ollama":
    case "generic": {
      const preset = PROVIDER_PRESETS[config.providerId];
      const baseUrl =
        config.baseUrl ??
        (config.providerId === "ollama" ? config.ollamaBaseUrl : undefined) ??
        preset?.baseUrl;
      if (!baseUrl) throw new ProviderError("PROVIDER_FAILURE", `provider ${config.providerId} requires a baseUrl`);
      return new OpenAICompatibleProvider({
        id: config.providerId,
        displayName: preset?.displayName ?? "OpenAI-compatible provider",
        baseUrl,
        apiKey: config.apiKey,
      });
    }
    default:
      throw new ProviderError("PROVIDER_FAILURE", `unknown provider: ${config.providerId}`);
  }
}
