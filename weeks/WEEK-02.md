# WEEK-02 — GitHub: auth, ingestion, normalized entities, rate limits

> Exit test: fixture-driven ingestion tests green (repos/issues/PRs incl. closed/reopened/stale cases); rate-limit handling proven with mock 429/ETag behavior; the auth path is documented and smoke-tested live with the user's account.

## Scope

- GitHub connection model: user-owned authorization (contract §2.2/§8). Decide GitHub App vs OAuth App vs PAT at week start (PROJECT-CORE open question #3) — decision becomes an ADR.
- REST/GraphQL client with: pagination, ETags where supported, backoff, rate-limit budget tracking (contract §126).
- Normalized entities: Repository, GitHubItem (issue/PR), labels/milestones, health snapshot fields (contract §95) — validated with zod at the boundary.
- Ingestion into the local candidate store (JSONL now, query layer later).
- Fixtures: closed/reopened issues, stale issues, permission-changed tokens, rate-limit responses (contract §205).
- Revalidation primitive: `checkIssueState` used before any task start (contract §10.4/§57).

## User dependencies

- GitHub App/OAuth credentials (USER-THING-TO-DO #1). Tests run on fixtures without them; the live smoke needs the user.
