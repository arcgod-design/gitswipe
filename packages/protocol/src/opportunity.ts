import { z } from "zod";

export const OPPORTUNITY_KINDS = [
  "EXISTING_ISSUE",
  "STALE_ISSUE",
  "AI_OPPORTUNITY",
  "SIMILAR_OPPORTUNITY",
  "REFERENCE_REPOSITORY",
  "PROJECT_OPPORTUNITY",
  "SECURITY_OPPORTUNITY",
  "DEPENDENCY_OPPORTUNITY",
] as const;

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export const SWIPE_ACTIONS = [
  "left",
  "right",
  "save",
  "open_detail",
  "work_started",
  "work_completed",
  "why_not_too_hard",
  "why_not_not_interesting",
  "why_not_already_known",
  "why_not_wrong_stack",
] as const;

export type SwipeAction = (typeof SWIPE_ACTIONS)[number];

export const EvidenceSchema = z.object({
  kind: z.enum(["code", "issue", "pr", "commit", "test", "doc", "dependency", "discussion"]),
  location: z.string().min(1),
  description: z.string().min(1),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const FindingRecordSchema = z.object({
  finding_id: z.string().min(1),
  repository: z.string().min(1),
  summary: z.string().min(1),
  problem_statement: z.string(),
  hypothesis: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(EvidenceSchema).min(1),
  related_issues: z.array(z.string()),
  related_prs: z.array(z.string()),
  related_commits: z.array(z.string()),
  code_locations: z.array(z.string()),
  duplicate_status: z.enum(["not_checked", "no_match_found", "likely_duplicate", "exact_duplicate", "related"]),
  status: z.enum(["candidate", "shown", "rejected", "accepted", "stale"]),
  created_at: z.string().datetime(),
  analysis_model: z.string(),
  analysis_version: z.string(),
  analyzed_revision: z.string().optional(),
});

export type FindingRecord = z.infer<typeof FindingRecordSchema>;

export const RankingReasonSchema = z.object({
  type: z.enum([
    "skill_match",
    "language_match",
    "framework_match",
    "domain_match",
    "saved_similarity",
    "repo_health",
    "issue_clarity",
    "estimated_effort",
    "learning_value",
    "portfolio_value",
    "reference_relevance",
    "risk",
  ]),
  value: z.union([z.number(), z.string()]),
  positive: z.boolean(),
});

export type RankingReason = z.infer<typeof RankingReasonSchema>;

export const UNIQUENESS_DISCLAIMER =
  "No matching open issue was found at analysis time. This is an AI-detected opportunity, not a proven unique issue." as const;
