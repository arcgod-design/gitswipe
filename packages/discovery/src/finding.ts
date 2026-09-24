import type { Evidence, FindingRecord } from "@jarvis/protocol";
import { newId } from "@jarvis/protocol";
import type { Candidate } from "./candidate.js";
import { issueClarity } from "./candidate.js";
import { checkDuplicates, type DuplicateMatch } from "./dedup.js";

export interface FindingInput {
  candidate: Candidate;
  existingIssues: ReadonlyArray<Pick<Candidate, "key" | "title" | "labels" | "repoFullName">>;
  codeLocations?: readonly string[];
  analysisModel?: string;
  analysisVersion?: string;
  analyzedRevision?: string;
  now?: Date;
}

export interface FindingOutcome {
  finding: FindingRecord;
  duplicates: DuplicateMatch[];
  rejected: boolean;
  rejectionReason?: string;
}

const CONFIDENCE_GATE = 0.55;
const MIN_EVIDENCE = 1;

export function assembleFinding(input: FindingInput): FindingOutcome {
  const now = input.now ?? new Date();
  const dup = checkDuplicates({ finding: input.candidate, existingIssues: input.existingIssues });

  const evidence: Evidence[] = [];
  if ((input.codeLocations?.length ?? 0) > 0) {
    for (const loc of input.codeLocations ?? []) {
      evidence.push({ kind: "code", location: loc, description: `referenced by analysis: ${input.candidate.title}` });
    }
  } else if (input.candidate.body.length > 0) {
    evidence.push({
      kind: "issue",
      location: input.candidate.htmlUrl,
      description: "issue body provides the problem statement and reproduction context",
    });
  }
  for (const match of dup.matches.filter((m) => m.status !== "exact_duplicate")) {
    evidence.push({ kind: "issue", location: match.key, description: match.reason });
  }

  const clarity = issueClarity(input.candidate);
  let confidence = 0.3 + clarity * 0.3;
  if (evidence.length >= 2) confidence += 0.15;
  if (input.codeLocations !== undefined && input.codeLocations.length > 0) confidence += 0.15;
  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  const weakEvidence = evidence.length < MIN_EVIDENCE;
  const exactDuplicate = dup.status === "exact_duplicate";

  const finding: FindingRecord = {
    finding_id: newId("fnd"),
    repository: input.candidate.repoFullName,
    summary: input.candidate.title,
    problem_statement: input.candidate.body,
    hypothesis: weakEvidence ? "hypothesis: evidence is thin, treat as lead not bug" : "",
    confidence,
    evidence,
    related_issues: dup.matches.filter((m) => m.status === "likely_duplicate" || m.status === "related").map((m) => m.key),
    related_prs: [],
    related_commits: [],
    code_locations: [...(input.codeLocations ?? [])],
    duplicate_status: dup.status === "novel_candidate" ? "no_match_found" : dup.status,
    status: "candidate",
    created_at: now.toISOString(),
    analysis_model: input.analysisModel ?? "deterministic-v0",
    analysis_version: input.analysisVersion ?? "0",
    analyzed_revision: input.analyzedRevision,
  };

  if (exactDuplicate) {
    return {
      finding,
      duplicates: dup.matches,
      rejected: true,
      rejectionReason: "exact duplicate of an existing issue - never resurface as new",
    };
  }
  if (dup.status === "likely_duplicate") {
    return {
      finding,
      duplicates: dup.matches,
      rejected: true,
      rejectionReason: "likely duplicate - surface only as related work, never as a new finding",
    };
  }
  if (confidence < CONFIDENCE_GATE) {
    return {
      finding,
      duplicates: dup.matches,
      rejected: true,
      rejectionReason: `below confidence gate (${confidence} < ${CONFIDENCE_GATE}) - re-analyze or discard`,
    };
  }
  return { finding, duplicates: dup.matches, rejected: false };
}

export const UNIQUENESS_WORDING =
  "No matching open issue was found at analysis time. This is an AI-detected opportunity, not a proven unique issue." as const;
