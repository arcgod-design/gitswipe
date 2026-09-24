export const MODEL_ROUTE_KEYS = [
  "discoveryQuickRank",
  "repositoryAnalysis",
  "promptGeneration",
  "embeddings",
  "securityReview",
] as const;

export type ModelRouteKey = (typeof MODEL_ROUTE_KEYS)[number];

export interface ModelRouteTarget {
  providerId: string;
  model: string;
}

export type RouteOverrides = Partial<Record<ModelRouteKey, ModelRouteTarget>>;

export function resolveRoute(key: ModelRouteKey, overrides: RouteOverrides, fallback: ModelRouteTarget): ModelRouteTarget {
  return overrides[key] ?? fallback;
}

export const TASK_ROUTING_FALLBACKS: Record<ModelRouteKey, string> = {
  discoveryQuickRank: "cheap",
  repositoryAnalysis: "strong",
  promptGeneration: "coding",
  embeddings: "embedding",
  securityReview: "review",
};
