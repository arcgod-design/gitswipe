import { JarvisError, type FailureCategory } from "@jarvis/protocol";

export class ProviderError extends JarvisError {
  constructor(
    category: FailureCategory,
    message: string,
    public readonly status?: number,
  ) {
    super(category, message);
    this.name = "ProviderError";
  }
}

export function statusToCategory(status: number): FailureCategory {
  if (status === 401 || status === 403) return "AUTH_FAILURE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_FAILURE";
  if (status === 408 || status === 504) return "TIMEOUT";
  return "PROVIDER_FAILURE";
}

export async function expectOk(res: Response, context: string): Promise<void> {
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  throw new ProviderError(statusToCategory(res.status), `${context}: HTTP ${res.status} ${body.slice(0, 200)}`, res.status);
}

export function errorToCategory(err: unknown): FailureCategory {
  const name = err instanceof Error ? err.name : "";
  if (name === "TimeoutError" || name === "AbortError") return "TIMEOUT";
  return "NETWORK_FAILURE";
}

export async function fetchOrThrow<T extends Response>(fn: () => Promise<T>, context: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new ProviderError(errorToCategory(err), `${context}: ${message}`);
  }
}

export function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
