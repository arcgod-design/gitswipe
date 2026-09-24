import { z } from "zod";

export const NormalizedRepositorySchema = z.object({
  id: z.number().int(),
  owner: z.string().min(1),
  name: z.string().min(1),
  full_name: z.string().min(1),
  default_branch: z.string().min(1),
  description: z.string().nullable(),
  language: z.string().nullable(),
  topics: z.array(z.string()),
  stargazers_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  archived: z.boolean(),
  license_spdx: z.string().nullable(),
  pushed_at: z.string().datetime(),
  html_url: z.string().url(),
});

export type NormalizedRepository = z.infer<typeof NormalizedRepositorySchema>;

export const IssueState = z.enum(["open", "closed"]);

export const NormalizedIssueSchema = z.object({
  kind: z.literal("issue"),
  repo_full_name: z.string().min(1),
  number: z.number().int().positive(),
  state: IssueState,
  title: z.string().min(1),
  body: z.string(),
  labels: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
  comments: z.number().int().nonnegative(),
  html_url: z.string().url(),
  stale: z.boolean().optional(),
});

export type NormalizedIssue = z.infer<typeof NormalizedIssueSchema>;

export const NormalizedPullRequestSchema = z.object({
  kind: z.literal("pr"),
  repo_full_name: z.string().min(1),
  number: z.number().int().positive(),
  state: z.enum(["open", "closed"]),
  title: z.string().min(1),
  draft: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  merged_at: z.string().datetime().nullable(),
  html_url: z.string().url(),
});

export type NormalizedPullRequest = z.infer<typeof NormalizedPullRequestSchema>;

export type GitHubItem = NormalizedIssue | NormalizedPullRequest;

export const STALE_AFTER_DAYS = 90;

export function isStale(issue: NormalizedIssue, now: Date = new Date()): boolean {
  if (issue.state !== "open") return false;
  const updated = Date.parse(issue.updated_at);
  return now.getTime() - updated > STALE_AFTER_DAYS * 24 * 60 * 60 * 1_000;
}

interface RawIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels?: Array<{ name?: string }>;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  comments?: number;
  html_url: string;
  pull_request?: unknown;
  draft?: boolean;
  merged_at?: string | null;
}

export function normalizeIssue(raw: RawIssue, repoFullName: string): GitHubItem {
  if (raw.pull_request !== undefined) {
    return NormalizedPullRequestSchema.parse({
      kind: "pr",
      repo_full_name: repoFullName,
      number: raw.number,
      state: raw.state,
      title: raw.title,
      draft: raw.draft ?? false,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      merged_at: raw.merged_at ?? null,
      html_url: raw.html_url,
    });
  }
  const issue: NormalizedIssue = NormalizedIssueSchema.parse({
    kind: "issue",
    repo_full_name: repoFullName,
    number: raw.number,
    state: raw.state,
    title: raw.title,
    body: raw.body ?? "",
    labels: (raw.labels ?? []).map((l) => l.name ?? ""),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    closed_at: raw.closed_at ?? null,
    comments: raw.comments ?? 0,
    html_url: raw.html_url,
  });
  return { ...issue, stale: isStale(issue) };
}

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  open_issues_count: number;
  archived: boolean;
  license?: { spdx_id?: string | null } | null;
  pushed_at: string;
  html_url: string;
}

export function normalizeRepository(raw: RawRepo): NormalizedRepository {
  return NormalizedRepositorySchema.parse({
    id: raw.id,
    owner: raw.full_name.split("/")[0] ?? "",
    name: raw.name,
    full_name: raw.full_name,
    default_branch: raw.default_branch,
    description: raw.description,
    language: raw.language,
    topics: raw.topics ?? [],
    stargazers_count: raw.stargazers_count,
    open_issues_count: raw.open_issues_count,
    archived: raw.archived,
    license_spdx: raw.license?.spdx_id ?? null,
    pushed_at: raw.pushed_at,
    html_url: raw.html_url,
  });
}
