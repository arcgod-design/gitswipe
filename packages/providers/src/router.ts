import type { AIProvider, EmbeddingRequest } from "./types.js";
import { ProviderError } from "./provider-error.js";
import { MODEL_ROUTE_KEYS, type ModelRouteKey, type RouteOverrides } from "./routing.js";

export interface RouteTarget {
  providerId: string;
  model: string;
}

export type RouteFallbacks = Record<ModelRouteKey, RouteTarget>;

export interface ResolvedRoute {
  provider: AIProvider;
  model: string;
}

export class ModelRouter {
  constructor(
    private readonly providers: ReadonlyMap<string, AIProvider>,
    private readonly overrides: RouteOverrides,
    private readonly fallbacks: RouteFallbacks,
  ) {}

  resolve(key: ModelRouteKey): ResolvedRoute {
    const target = this.overrides[key] ?? this.fallbacks[key];
    if (!target) throw new ProviderError("PROVIDER_FAILURE", `no route configured for ${key}`);
    const provider = this.providers.get(target.providerId);
    if (!provider) {
      throw new ProviderError("PROVIDER_FAILURE", `route ${key} points at unconfigured provider ${target.providerId}`);
    }
    return { provider, model: target.model };
  }

  resolveEmbeddings(req: Omit<EmbeddingRequest, "model">, key: ModelRouteKey = "embeddings"): ResolvedRoute & { request: EmbeddingRequest } {
    const route = this.resolve(key);
    if (!route.provider.capabilities().embeddings || route.provider.embeddings === undefined) {
      throw new ProviderError("PROVIDER_FAILURE", `provider ${route.provider.id} does not support embeddings`);
    }
    return { ...route, request: { ...req, model: route.model } };
  }

  authorizedChain(key: ModelRouteKey, allowed: readonly string[]): ResolvedRoute[] {
    const chain: ResolvedRoute[] = [];
    const primary = this.resolve(key);
    if (!allowed.includes(primary.provider.id)) {
      throw new ProviderError("PROVIDER_FAILURE", `route ${key} primary ${primary.provider.id} is not user-authorized`);
    }
    chain.push(primary);
    for (const id of allowed) {
      if (id === primary.provider.id) continue;
      const provider = this.providers.get(id);
      if (provider) chain.push({ provider, model: primary.model });
    }
    return chain;
  }
}

export const DEFAULT_ROUTE_FALLBACKS: RouteFallbacks = {
  discoveryQuickRank: { providerId: "ollama", model: "qwen3:8b" },
  repositoryAnalysis: { providerId: "openai", model: "gpt-4o-mini" },
  promptGeneration: { providerId: "openai", model: "gpt-4o" },
  embeddings: { providerId: "ollama", model: "nomic-embed-text" },
  securityReview: { providerId: "anthropic", model: "claude-sonnet-4" },
};

export const ALL_ROUTE_KEYS = MODEL_ROUTE_KEYS;
