import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitHubClient } from "../src/client.js";
import { TokenGitHubAuth } from "../src/auth.js";
import { MemorySecretStore } from "@jarvis/providers";
import {
  checkIssueState,
  fetchRepository,
  ingestRepoIntoStore,
  ingestIssues,
} from "../src/ingest.js";
import { JsonlCandidateStore, makeCandidateKey, makeCandidateRecord } from "../src/store.js";
import { normalizeIssue, isStale, type NormalizedIssue } from "../src/entities.js";

let server: Server | null = null;
let baseUrl = "";
let requests: Array<{ url: string; headers: Record<string, string> }> = [];
let handlers: Array<(req: { url: string; headers: Record<string, string> }, res: any) => void> = [];

function enqueue(handler: (req: { url: string; headers: Record<string, string> }, res: any) => void): void {
  handlers.push(handler);
}

async function startMock(): Promise<void> {
  requests = [];
  handlers = [];
  server = createServer((req, res) => {
    const record = { url: req.url ?? "", headers: req.headers as Record<string, string> };
    requests.push(record);
    const handler = handlers.length > 1 ? handlers.shift() : handlers[0];
    if (handler) handler(record, res);
    else {
      res.writeHead(404);
      res.end("{}");
    }
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr && typeof addr === "object" ? addr.port : 0}`;
}

afterEach(() => {
  if (server) {
    server.closeAllConnections();
    server.close();
    server = null;
  }
});

function clientWith(token = "ghp_test"): GitHubClient {
  const store = new MemorySecretStore();
  return new GitHubClient({
    baseUrl,
    auth: new TokenGitHubAuth({
      store: undefined,
      env: { GITHUB_TOKEN: token },
    }),
    timeoutMs: 2_000,
  });
}

describe("GitHubClient", () => {
  it("sends auth + api-version headers and tracks rate budget", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "x-ratelimit-limit": "5000",
        "x-ratelimit-remaining": "4999",
        "x-ratelimit-reset": "1800000000",
      });
      res.end(JSON.stringify({ ok: true }));
    });
    const client = clientWith("ghp_test");
    const res = await client.get<{ ok: boolean }>("/whatever");
    expect(res.data).toEqual({ ok: true });
    expect(requests[0]?.headers.authorization).toBe("Bearer ghp_test");
    expect(requests[0]?.headers["x-github-api-version"]).toBe("2022-11-28");
    expect(client.rateBudget()).toEqual({ limit: 5000, remaining: 4999, resetAt: 1_800_000_000_000 });
  });

  it("conditional ETag request returns 304 notModified with cached semantics", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, { etag: '"abc123"' });
      res.end(JSON.stringify({ v: 1 }));
    });
    enqueue((req, res) => {
      expect(req.headers["if-none-match"]).toBe('"abc123"');
      res.writeHead(304, { etag: '"abc123"' });
      res.end();
    });
    const client = clientWith();
    const first = await client.get<{ v: number }>("/repos/x");
    expect(first.notModified).toBe(false);
    expect(first.etag).toBe('"abc123"');
    const second = await client.get<{ v: number }>("/repos/x", { etag: first.etag });
    expect(second.notModified).toBe(true);
    expect(second.data).toBeNull();
  });

  it("429 with Retry-After backs off then succeeds; rate budget visible", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(429, { "retry-after": "0", "x-ratelimit-remaining": "0" });
      res.end("{}");
    });
    enqueue((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ recovered: true }));
    });
    const client = clientWith();
    const res = await client.get<{ recovered: boolean }>("/limited");
    expect(res.data).toEqual({ recovered: true });
    expect(requests).toHaveLength(2);
  });

  it("403 with exhausted rate limit maps to RATE_LIMITED, not AUTH_FAILURE", async () => {
    await startMock();
    for (let i = 0; i < 5; i++) {
      enqueue((_req, res) => {
        res.writeHead(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1) });
        res.end("{}");
      });
    }
    const client = clientWith();
    await expect(client.get("/blocked", { maxRetries: 2 })).rejects.toThrow(/\[RATE_LIMITED\]/);
  });

  it("401 maps to AUTH_FAILURE", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(401);
      res.end("{}");
    });
    const client = clientWith();
    await expect(client.get("/user")).rejects.toThrow(/\[AUTH_FAILURE\]/);
  });

  it("paginate follows Link rel=next across pages and stops without it", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "application/json",
        link: `<${baseUrl}/repos/o/r/issues?page=2>; rel="next", <${baseUrl}/repos/o/r/issues?page=1>; rel="first"`,
      });
      res.end(JSON.stringify([{ number: 1 }]));
    });
    enqueue((req, res) => {
      expect(req.url).toContain("page=2");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([{ number: 2 }]));
    });
    const client = clientWith();
    const pages: Array<Array<Record<string, number>>> = [];
    for await (const page of client.paginate<Record<string, number>>("/repos/o/r/issues")) {
      pages.push(page);
    }
    expect(pages).toEqual([[{ number: 1 }], [{ number: 2 }]]);
  });
});

const rawIssue = {
  number: 101,
  title: "Add retry backoff",
  body: "reconnect retries too fast",
  state: "open" as const,
  labels: [{ name: "bug" }, { name: "help wanted" }],
  created_at: "2026-01-10T00:00:00Z",
  updated_at: new Date().toISOString(),
  closed_at: null,
  comments: 2,
  html_url: "https://github.com/o/r/issues/101",
};

const rawPrInIssuesList = {
  ...rawIssue,
  number: 102,
  title: "PR sneaked into issues list",
  html_url: "https://github.com/o/r/pull/102",
  pull_request: { url: "https://api.github.com/repos/o/r/pulls/102" },
};

describe("normalization + fixtures (contract s205)", () => {
  it("separates PRs from issues in the issues endpoint payload", () => {
    const issue = normalizeIssue(rawIssue as never, "o/r");
    const pr = normalizeIssue(rawPrInIssuesList as never, "o/r");
    expect(issue.kind).toBe("issue");
    expect(pr.kind).toBe("pr");
    if (issue.kind === "issue") {
      expect(issue.labels).toEqual(["bug", "help wanted"]);
      expect(issue.stale).toBe(false);
    }
  });

  it("flags stale issues (open, untouched for > 90 days) and never flags closed ones", () => {
    const staleRaw = {
      ...rawIssue,
      number: 103,
      updated_at: "2026-01-01T00:00:00Z",
    };
    const stale = normalizeIssue(staleRaw as never, "o/r");
    expect(stale.kind === "issue" && stale.stale).toBe(true);

    const staleButClosed = normalizeIssue({ ...staleRaw, state: "closed", closed_at: "2026-02-01T00:00:00Z" } as never, "o/r");
    expect(staleButClosed.kind === "issue" && staleButClosed.stale).toBe(false);

    const reopened: NormalizedIssue = {
      ...(stale as NormalizedIssue),
      state: "open",
      updated_at: new Date().toISOString(),
    };
    expect(isStale(reopened)).toBe(false);
  });

  it("normalizeRepository keeps health snapshot fields", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: 1,
          name: "r",
          full_name: "o/r",
          default_branch: "main",
          description: null,
          language: "TypeScript",
          topics: ["ai"],
          stargazers_count: 120,
          open_issues_count: 7,
          archived: false,
          license: { spdx_id: "MIT" },
          pushed_at: new Date().toISOString(),
          html_url: "https://github.com/o/r",
        }),
      );
    });
    const client = clientWith();
    const repo = await fetchRepository(client, "o/r");
    expect(repo.license_spdx).toBe("MIT");
    expect(repo.language).toBe("TypeScript");
    expect(repo.open_issues_count).toBe(7);
  });
});

describe("candidate store", () => {
  it("append + upsert round-trip survives file re-read", () => {
    const dir = mkdtempSync(join(tmpdir(), "jvs-cand-"));
    const store = new JsonlCandidateStore(join(dir, "candidates.jsonl"));
    const issue = normalizeIssue(rawIssue as never, "o/r");
    const record = makeCandidateRecord(issue, new Date("2026-09-24T00:00:00Z"));
    store.append(record);
    expect(store.readAll()).toHaveLength(1);
    expect(store.readAll()[0]?.key).toBe(makeCandidateKey(issue));

    const updated = makeCandidateRecord({ ...issue, comments: 5 } as NormalizedIssue, new Date("2026-09-25T00:00:00Z"));
    store.upsert(updated);
    const all = store.readAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.payload).toEqual(updated.payload);
    expect(all[0]?.last_sync_at).toBe("2026-09-25T00:00:00.000Z");
    expect(all[0]?.first_seen_at).toBe("2026-09-24T00:00:00.000Z");
  });
});

describe("ingestion + revalidation", () => {
  it("ingestRepoIntoStore counts issues/PRs/stale and upserts records", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify([
          rawIssue,
          rawPrInIssuesList,
          { ...rawIssue, number: 103, updated_at: "2026-01-01T00:00:00Z" },
          { ...rawIssue, number: 104, state: "closed", closed_at: "2026-05-01T00:00:00Z" },
        ]),
      );
    });
    const client = clientWith();
    const dir = mkdtempSync(join(tmpdir(), "jvs-ing-"));
    const store = new JsonlCandidateStore(join(dir, "candidates.jsonl"));
    const result = await ingestRepoIntoStore(client, "o/r", store, { maxPages: 1 });
    expect(result.issues).toBe(3);
    expect(result.pullRequests).toBe(1);
    expect(result.staleIssues).toBe(1);
    expect(store.readAll()).toHaveLength(4);
  });

  it("checkIssueState: open passes, closed reports, 404 not_found, 403 permission_denied", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rawIssue));
    });
    enqueue((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...rawIssue, state: "closed", closed_at: "2026-06-01T00:00:00Z" }));
    });
    enqueue((_req, res) => {
      res.writeHead(404);
      res.end("{}");
    });
    enqueue((_req, res) => {
      res.writeHead(403, { "x-ratelimit-remaining": "42" });
      res.end("{}");
    });
    const client = clientWith();
    const open = await checkIssueState(client, "o/r", 101, "open");
    expect(open.ok).toBe(true);
    const closed = await checkIssueState(client, "o/r", 101, "open");
    expect(closed).toEqual({ ok: false, reason: "closed" });
    const gone = await checkIssueState(client, "o/r", 101, "open");
    expect(gone).toEqual({ ok: false, reason: "not_found" });
    const forbidden = await checkIssueState(client, "o/r", 101, "open");
    expect(forbidden).toEqual({ ok: false, reason: "permission_denied" });
  });

  it("ingestIssues yields nothing for empty pages", async () => {
    await startMock();
    enqueue((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
    });
    const client = clientWith();
    const seen: unknown[] = [];
    for await (const item of ingestIssues(client, "o/r")) seen.push(item);
    expect(seen).toEqual([]);
  });
});
