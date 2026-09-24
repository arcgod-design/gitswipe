import type { NormalizedIssue, NormalizedRepository } from "@jarvis/github";

export const DEMO_NOTICE =
  "DEMO DATA — fixture issues from fictional repositories. Not connected to GitHub; no real credentials are read in demo mode." as const;

export const DEMO_COMMIT_IDENTITY = {
  name: "Archit Adish Gupta",
  email: "arcgod-design@users.noreply.github.com",
} as const;

export const DEMO_WORKTREE_ROOT = "C:/gitswipe-demo-workspaces";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1_000).toISOString();
}

const demoRepos: NormalizedRepository[] = [
  {
    id: 9001,
    owner: "demo",
    name: "acme-api-server",
    full_name: "demo/acme-api-server",
    default_branch: "main",
    description: "Fixture: a fictional FastAPI-style backend for the demo feed.",
    language: "Python",
    topics: ["backend", "api"],
    stargazers_count: 340,
    open_issues_count: 12,
    archived: false,
    license_spdx: "MIT",
    pushed_at: daysAgo(2),
    html_url: "https://github.com/demo/acme-api-server",
  },
  {
    id: 9002,
    owner: "demo",
    name: "orbit-dashboard",
    full_name: "demo/orbit-dashboard",
    default_branch: "main",
    description: "Fixture: a fictional React analytics dashboard.",
    language: "TypeScript",
    topics: ["frontend", "react"],
    stargazers_count: 812,
    open_issues_count: 27,
    archived: false,
    license_spdx: "MIT",
    pushed_at: daysAgo(1),
    html_url: "https://github.com/demo/orbit-dashboard",
  },
  {
    id: 9003,
    owner: "demo",
    name: "rustkube",
    full_name: "demo/rustkube",
    default_branch: "main",
    description: "Fixture: a fictional Rust k8s tool.",
    language: "Rust",
    topics: ["kubernetes", "cli"],
    stargazers_count: 95,
    open_issues_count: 5,
    archived: false,
    license_spdx: "Apache-2.0",
    pushed_at: daysAgo(40),
    html_url: "https://github.com/demo/rustkube",
  },
];

function issue(
  repoIndex: number,
  number: number,
  title: string,
  body: string,
  labels: string[],
  over: Partial<NormalizedIssue> = {},
): NormalizedIssue {
  const repo = demoRepos[repoIndex]!;
  return {
    kind: "issue",
    repo_full_name: repo.full_name,
    number,
    state: "open",
    title,
    body,
    labels,
    created_at: daysAgo(120),
    updated_at: daysAgo(10),
    closed_at: null,
    comments: 3,
    html_url: `${repo.html_url}/issues/${number}`,
    stale: false,
    ...over,
  };
}

export const demoIssues: NormalizedIssue[] = [
  issue(0, 301, "Add exponential backoff to webhook retries", "Webhook delivery retries immediately on failure, causing a thundering herd when the target is down. Acceptance: configurable max retries, exponential delay between attempts, tests for the retry loop.", ["bug", "help wanted"]),
  issue(0, 302, "Export audit logs as CSV", "Compliance users need a CSV export of the audit log with date filters.", ["feature", "good first issue"], { updated_at: daysAgo(200), stale: true }),
  issue(1, 501, "Dashboard charts flash empty state on slow networks", "On 3G the charts mount before data arrives and flash the no-data state. Add skeleton loaders with a minimum display window.", ["bug", "frontend", "help wanted"]),
  issue(1, 502, "Add keyboard navigation to the filter panel", "The filter panel is mouse-only. Add arrow-key navigation and focus trapping per the a11y checklist.", ["accessibility", "good first issue"]),
  issue(1, 503, "Migrate legacy charts to the new chart library", "Six screens still use charts v1. Migrate and delete the old dependency.", ["refactor"]),
  issue(2, 71, "Connection pool leaks sockets on forced disconnect", "Forced TCP disconnects leave sockets in the pool forever. Add a liveness probe with a reaper task.", ["bug", "networking", "help wanted"], { updated_at: daysAgo(260), stale: true }),
];

export function demoRepoMap(): Map<string, NormalizedRepository> {
  return new Map(demoRepos.map((r) => [r.full_name, r]));
}

export function demoLanguageSeed(): (string | null)[] {
  return ["TypeScript", "Python", "TypeScript"];
}
