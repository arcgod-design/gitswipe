import { JarvisError, type FailureCategory } from "@jarvis/protocol";
import type { GitHubAuth } from "./auth.js";

export interface RateBudget {
  limit: number | null;
  remaining: number | null;
  resetAt: number | null;
}

export interface GitHubResponse<T> {
  status: number;
  data: T | null;
  etag: string | null;
  notModified: boolean;
  links: Record<"next" | "prev" | "first" | "last", string | null>;
  rate: RateBudget;
}

export interface GetOptions {
  etag?: string | null;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
  maxRetries?: number;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly auth: GitHubAuth;
  private readonly doFetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  private rate: RateBudget = { limit: null, remaining: null, resetAt: null };

  constructor(opts: { baseUrl?: string; auth: GitHubAuth; fetch?: typeof globalThis.fetch; timeoutMs?: number }) {
    this.baseUrl = (opts.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.auth = opts.auth;
    this.doFetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  rateBudget(): RateBudget {
    return { ...this.rate };
  }

  async get<T>(path: string, options: GetOptions = {}): Promise<GitHubResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options.page !== undefined) url.searchParams.set("page", String(options.page));
    if (options.perPage !== undefined) url.searchParams.set("per_page", String(options.perPage));
    const headers: Record<string, string> = { Accept: "application/vnd.github+json", ...(await this.auth.header()) };
    if (options.etag) headers["If-None-Match"] = options.etag;
    const maxRetries = options.maxRetries ?? 3;
    let attempt = 0;
    while (true) {
      attempt += 1;
      let res: Response;
      try {
        res = await this.doFetch(url.toString(), {
          headers,
          signal: options.signal ?? AbortSignal.timeout(this.timeoutMs),
        });
      } catch (err) {
        throw new JarvisError("NETWORK_FAILURE", `github: ${err instanceof Error ? err.message : String(err)}`);
      }
      this.updateRate(res);
      if (res.status === 304) {
        return this.buildResponse<T>(res, null);
      }
      if (res.ok) {
        const data = (await res.json()) as T;
        return this.buildResponse<T>(res, data);
      }
      const category = this.statusCategory(res, res.status);
      if (attempt < maxRetries && (category === "RATE_LIMITED" || res.status >= 500)) {
        await this.backoffDelay(res);
        continue;
      }
      const body = await res.text().catch(() => "");
      throw new JarvisError(category, `github ${path}: HTTP ${res.status} ${body.slice(0, 160)}`);
    }
  }

  async *paginate<T>(path: string, options: { perPage?: number; maxPages?: number; signal?: AbortSignal } = {}): AsyncIterable<T[]> {
    const maxPages = options.maxPages ?? 10;
    let page = 1;
    let pages = 0;
    while (pages < maxPages) {
      const res = await this.get<T[]>(path, { page, perPage: options.perPage ?? 100, signal: options.signal });
      if (res.data === null || res.data.length === 0) return;
      yield res.data;
      pages += 1;
      if (!res.links.next) return;
      page += 1;
    }
  }

  private buildResponse<T>(res: Response, data: T | null): GitHubResponse<T> {
    return {
      status: res.status,
      data,
      etag: res.headers.get("etag"),
      notModified: res.status === 304,
      links: parseLinkHeader(res.headers.get("link")),
      rate: { ...this.rate },
    };
  }

  private updateRate(res: Response): void {
    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    this.rate = {
      limit: limit !== null ? Number.parseInt(limit, 10) : null,
      remaining: remaining !== null ? Number.parseInt(remaining, 10) : null,
      resetAt: reset !== null ? Number.parseInt(reset, 10) * 1000 : null,
    };
  }

  private statusCategory(res: Response, status: number): FailureCategory {
    if (status === 401 || status === 403) {
      if (this.rate.remaining === 0) return "RATE_LIMITED";
      return "AUTH_FAILURE";
    }
    if (status === 404) return "GITHUB_STATE_CHANGED";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "PROVIDER_FAILURE";
    return "UNKNOWN";
  }

  private async backoffDelay(res: Response): Promise<void> {
    const retryAfter = res.headers.get("retry-after");
    let ms = 1_000;
    if (retryAfter !== null) {
      const seconds = Number.parseInt(retryAfter, 10);
      if (!Number.isNaN(seconds)) ms = Math.min(seconds * 1_000, 5_000);
    } else if (this.rate.resetAt !== null) {
      ms = Math.min(Math.max(this.rate.resetAt - Date.now(), 0), 5_000);
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function parseLinkHeader(header: string | null): Record<"next" | "prev" | "first" | "last", string | null> {
  const out = { next: null, prev: null, first: null, last: null } as Record<"next" | "prev" | "first" | "last", string | null>;
  if (!header) return out;
  for (const part of header.split(",")) {
    const match = /<([^>]+)>;\s*rel="([^"]+)"/.exec(part.trim());
    if (match && (match[2] === "next" || match[2] === "prev" || match[2] === "first" || match[2] === "last")) {
      out[match[2]] = match[1] ?? null;
    }
  }
  return out;
}
