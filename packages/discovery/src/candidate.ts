import type { CandidateRecord } from "@jarvis/github";
import type { NormalizedIssue, NormalizedRepository } from "@jarvis/github";
import type { OpportunityKind } from "@jarvis/protocol";

export interface Candidate {
  key: string;
  kind: OpportunityKind;
  repoFullName: string;
  number: number;
  title: string;
  body: string;
  labels: string[];
  language: string | null;
  updatedAt: string;
  stalenessDays: number;
  archived: boolean;
  htmlUrl: string;
}

const WELCOMING_LABELS = new Set(["help wanted", "good first issue", "good first bug", "contributions welcome", "hacktoberfest"]);

export function classifyIssue(item: NormalizedIssue): OpportunityKind {
  if (item.state === "open" && (item.stale ?? false)) return "STALE_ISSUE";
  return "EXISTING_ISSUE";
}

export function buildCandidate(item: NormalizedIssue, repo: NormalizedRepository | null): Candidate {
  return {
    key: `${item.kind}:${item.repo_full_name}:${item.number}`,
    kind: classifyIssue(item),
    repoFullName: item.repo_full_name,
    number: item.number,
    title: item.title,
    body: item.body,
    labels: item.labels,
    language: repo?.language ?? null,
    updatedAt: item.updated_at,
    stalenessDays: item.stale ? daysSince(item.updated_at) : 0,
    archived: repo?.archived ?? false,
    htmlUrl: item.html_url,
  };
}

export function candidatesFromRecords(
  records: readonly CandidateRecord[],
  repos: ReadonlyMap<string, NormalizedRepository>,
): Candidate[] {
  const out: Candidate[] = [];
  for (const record of records) {
    if (record.payload.kind !== "issue") continue;
    out.push(buildCandidate(record.payload, repos.get(record.repo_full_name) ?? null));
  }
  return out;
}

export function issueClarity(candidate: Candidate): number {
  let score = 0;
  if (candidate.body.length > 200) score += 0.4;
  else if (candidate.body.length > 40) score += 0.2;
  if (candidate.labels.some((l) => WELCOMING_LABELS.has(l.toLowerCase()))) score += 0.4;
  if (candidate.labels.length > 0) score += 0.2;
  return Math.min(score, 1);
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / (24 * 60 * 60 * 1_000)));
}
