import type { SecretStore } from "@jarvis/providers";

export interface GitHubAuth {
  readonly kind: string;
  header(): Promise<Record<string, string>>;
  describe(): Promise<string>;
}

export const GITHUB_TOKEN_KEY = "github:token";
const GITHUB_TOKEN_ENV = "GITHUB_TOKEN";

export interface TokenAuthOptions {
  store?: SecretStore;
  env?: Record<string, string | undefined>;
}

export class TokenGitHubAuth implements GitHubAuth {
  readonly kind = "pat";
  private readonly store?: SecretStore;
  private readonly env: Record<string, string | undefined>;

  constructor(opts: TokenAuthOptions = {}) {
    this.store = opts.store;
    this.env = opts.env ?? process.env;
  }

  async header(): Promise<Record<string, string>> {
    const token = await this.token();
    if (!token) throw new Error("no GitHub token configured (os store 'github:token' or GITHUB_TOKEN env)");
    return { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
  }

  async describe(): Promise<string> {
    const token = await this.token();
    if (!token) return "none";
    const source = (await this.store?.get(GITHUB_TOKEN_KEY)) !== null ? "os-store" : "env-dev";
    return `pat (${source}, ${token.slice(0, 4)}...)`;
  }

  private async token(): Promise<string | null> {
    if (this.store) {
      const stored = await this.store.get(GITHUB_TOKEN_KEY);
      if (stored !== null && stored.length > 0) return stored;
    }
    const fromEnv = this.env[GITHUB_TOKEN_ENV];
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    return null;
  }
}
