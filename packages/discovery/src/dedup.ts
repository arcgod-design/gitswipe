import type { Candidate } from "./candidate.js";

export type DuplicateStatus =
  | "exact_duplicate"
  | "likely_duplicate"
  | "related"
  | "novel_candidate";

export interface DuplicateCheckInput {
  finding: Pick<Candidate, "title" | "labels" | "repoFullName">;
  existingIssues: ReadonlyArray<Pick<Candidate, "key" | "title" | "labels" | "repoFullName">>;
  lexicalThreshold?: number;
}

export interface DuplicateMatch {
  key: string;
  status: DuplicateStatus;
  similarity: number;
  reason: string;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(title: string): Set<string> {
  const stop = new Set(["the", "a", "an", "of", "to", "for", "in", "on", "is", "not", "and", "or", "with", "when", "add", "fix"]);
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((t) => t.length > 2 && !stop.has(t)),
  );
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function checkDuplicates(input: DuplicateCheckInput): { status: DuplicateStatus; matches: DuplicateMatch[] } {
  const threshold = input.lexicalThreshold ?? 0.55;
  const findingTokens = tokenize(input.finding.title);
  const matches: DuplicateMatch[] = [];

  for (const issue of input.existingIssues) {
    if (normalizeTitle(issue.title) === normalizeTitle(input.finding.title)) {
      matches.push({
        key: issue.key,
        status: "exact_duplicate",
        similarity: 1,
        reason: "identical normalized title",
      });
      continue;
    }
    const similarity = jaccard(findingTokens, tokenize(issue.title));
    const sameRepo = issue.repoFullName === input.finding.repoFullName;
    const labelOverlap = issue.labels.filter((l) => input.finding.labels.includes(l)).length;
    if (similarity >= threshold && (sameRepo || labelOverlap > 0)) {
      matches.push({
        key: issue.key,
        status: "likely_duplicate",
        similarity,
        reason: `lexical similarity ${similarity.toFixed(2)}${sameRepo ? " in same repo" : ` with ${labelOverlap} shared labels`}`,
      });
    } else if (similarity >= threshold * 0.6 || labelOverlap >= 2) {
      matches.push({
        key: issue.key,
        status: "related",
        similarity,
        reason: labelOverlap >= 2 ? `${labelOverlap} shared labels` : `partial lexical overlap ${similarity.toFixed(2)}`,
      });
    }
  }

  const status: DuplicateStatus = matches.some((m) => m.status === "exact_duplicate")
    ? "exact_duplicate"
    : matches.some((m) => m.status === "likely_duplicate")
      ? "likely_duplicate"
      : matches.some((m) => m.status === "related")
        ? "related"
        : "novel_candidate";
  return { status, matches };
}
