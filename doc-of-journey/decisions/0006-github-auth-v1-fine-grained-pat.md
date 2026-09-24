# ADR 0006 — GitHub auth for v1: fine-grained PAT in the OS secret store

Date: 2026-09-24
Status: LOCKED (revisit at WEEK-08+ with an ADR if OAuth/GitHub-App lands)

## Context

Contract §2.2/§8: user-owned GitHub authorization, least privilege, prefer App/OAuth/scoped tokens over long-lived PATs "where practical". Three candidates:

1. **GitHub App** — installation tokens (1h, per-repo). Best security posture, but every self-hoster must create + configure their own GitHub App; heaviest setup path. Post-v1.
2. **OAuth App device flow** — no secret needed, but a user must still register an OAuth app for a client_id, and the `repo` scope grants access to ALL repos — *broader* than a fine-grained PAT.
3. **Fine-grained PAT** — user creates in browser, selects exactly which repos, exactly which permissions, per-repo scope, revocable independently, zero infrastructure. Long-lived, but stored only in the OS credential store (WEEK-01 SecretStore) and rotatable.

## Decision

**v1 ships TokenGitHubAuth: fine-grained PAT** (per-repo, read-only + issues/PRs write when the user enables it), resolved from the OS secret store (`github:token`) > env `GITHUB_TOKEN` (dev-flagged) > none. The auth layer is a `GitHubAuth` interface so OAuth-device-flow and GitHub-App adapters can be added later without touching the client or ingestion (contract §8's revalidation/preference stands).

Least-privilege guidance ships in docs: token scoped to selected repositories only; write scopes only when the user wants issue/PR creation.

## Consequences

- Zero-blocking auth path that works today for any user; U3 (OAuth creds) becomes optional rather than a dependency.
- Contract's anti-PAT language was aimed at classic full-account PATs; fine-grained per-repo PATs satisfy the least-privilege intent for a local-first v1.
- Token never in `.env` for production paths (env is dev-flagged), never in logs; client redacts `Authorization` on error surfaces.
- GitHub App / OAuth device flow: SUGGESTIONS/ROADMAP; needs an ADR when scheduled.
