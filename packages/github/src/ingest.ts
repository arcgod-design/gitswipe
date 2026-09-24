import type { GitHubClient } from "./client.js";
import {
  isStale,
  normalizeIssue,
  normalizeRepository,
  type GitHubItem,
  type NormalizedIssue,
  type NormalizedRepository,
} from "./entities.js";
import { makeCandidateRecord, type CandidateRecord } from "./store.js";

export async function fetchRepository(client: GitHubClient, fullName: string): Promise<NormalizedRepository> {
  const res = await client.get<Record<string, unknown>>(`/repos/${fullName}`);
  return normalizeRepository(res.data as never);
}

export async function* ingestIssues(
  client: GitHubClient,
  repoFullName: string,
  opts: { state?: "open" | "closed" | "all"; maxPages?: number } = {},
): AsyncIterable<GitHubItem> {
  const state = opts.state ?? "all";
  for await (const page of client.paginate<Record<string, unknown>>(`/repos/${repoFullName}/issues`, {
    perPage: 100,
    maxPages: opts.maxPages,
  })) {
    for (const raw of page) {
      yield normalizeIssue(raw as never, repoFullName);
    }
  }
}

export async function* ingestPullRequests(
  client: GitHubClient,
  repoFullName: string,
  opts: { maxPages?: number } = {},
): AsyncIterable<GitHubItem> {
  for await (const page of client.paginate<Record<string, unknown>>(`/repos/${repoFullName}/pulls`, {
    perPage: 100,
    maxPages: opts.maxPages,
  })) {
    for (const raw of page) {
      yield normalizeIssue({ ...(raw as Record<string, unknown>), pull_request: {} } as never, repoFullName);
    }
  }
}

export interface IngestResult {
  issues: number;
  pullRequests: number;
  staleIssues: number;
  records: CandidateRecord[];
}

export async function ingestRepoIntoStore(
  client: GitHubClient,
  repoFullName: string,
  store: { upsert(record: CandidateRecord): void },
  opts: { maxPages?: number } = {},
): Promise<IngestResult> {
  const now = new Date();
  const result: IngestResult = { issues: 0, pullRequests: 0, staleIssues: 0, records: [] };
  for await (const item of ingestIssues(client, repoFullName, { maxPages: opts.maxPages })) {
    if (item.kind === "issue") {
      result.issues += 1;
      if (item.stale ?? isStale(item)) result.staleIssues += 1;
    } else {
      result.pullRequests += 1;
    }
    const record = makeCandidateRecord(item, now);
    store.upsert(record);
    result.records.push(record);
  }
  return result;
}

export type RevalidationResult =
  | { ok: true; state: "open" | "closed"; issue: NormalizedIssue }
  | { ok: false; reason: "closed" | "not_found" | "permission_denied" };

export async function checkIssueState(
  client: GitHubClient,
  repoFullName: string,
  number: number,
  expected: "open" | "closed" = "open",
): Promise<RevalidationResult> {
  try {
    const res = await client.get<Record<string, unknown>>(`/repos/${repoFullName}/issues/${number}`);
    const item = normalizeIssue(res.data as never, repoFullName);
    if (item.kind !== "issue") return { ok: false, reason: "not_found" };
    if (item.state !== expected) return { ok: false, reason: "closed" };
    return { ok: true, state: item.state, issue: item };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("HTTP 404")) return { ok: false, reason: "not_found" };
      if (err.message.includes("HTTP 403")) return { ok: false, reason: "permission_denied" };
    }
    throw err;
  }
}
