import type { SecretStore } from "./secret-store.js";

export type KeySource = "os-store" | "env-dev" | "none";

export interface ResolvedKey {
  key?: string;
  source: KeySource;
}

const ENV_KEYS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export async function resolveApiKey(
  providerId: string,
  store: SecretStore,
  env: Record<string, string | undefined> = process.env,
): Promise<ResolvedKey> {
  const stored = await store.get(`provider:${providerId}`);
  if (stored !== null && stored.length > 0) return { key: stored, source: "os-store" };
  const envName = ENV_KEYS[providerId];
  if (envName) {
    const value = env[envName];
    if (value && value.length > 0) return { key: value, source: "env-dev" };
  }
  return { source: "none" };
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
