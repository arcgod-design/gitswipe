import type { AIProvider, ChatRequest, ChatResponse } from "./types.js";
import { ProviderError } from "./provider-error.js";
import type { ResolvedRoute } from "./router.js";

const FAILOVERABLE = new Set(["RATE_LIMITED", "PROVIDER_FAILURE", "TIMEOUT", "NETWORK_FAILURE"]);

export interface FailoverAttempt {
  providerId: string;
  error?: string;
}

export interface FailoverOutcome {
  response: ChatResponse;
  providerId: string;
  attempts: FailoverAttempt[];
}

export async function chatWithFailover(
  chain: readonly ResolvedRoute[],
  req: ChatRequest,
): Promise<FailoverOutcome> {
  if (chain.length === 0) throw new ProviderError("PROVIDER_FAILURE", "empty failover chain");
  const attempts: FailoverAttempt[] = [];
  for (const link of chain) {
    try {
      const response = await link.provider.chat({ ...req, model: link.model });
      return { response, providerId: link.provider.id, attempts };
    } catch (err) {
      if (err instanceof ProviderError) {
        attempts.push({ providerId: link.provider.id, error: err.message });
        if (!FAILOVERABLE.has(err.category)) throw err;
      } else {
        attempts.push({
          providerId: link.provider.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  throw new ProviderError(
    "PROVIDER_FAILURE",
    `all ${chain.length} authorized providers failed: ${attempts.map((a) => `${a.providerId}: ${a.error}`).join(" | ")}`,
  );
}
