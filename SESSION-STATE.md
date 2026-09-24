# SESSION-STATE.md — as of 2026-09-24 (WEEK-02 complete)

## Current week

**WEEK-02** — ✅ **DONE (fixture-driven).** GitHub client with pagination/ETag/backoff/rate-budget; fine-grained PAT auth (ADR 0006) through the OS secret store; zod-normalized entities with stale detection; JSONL candidate store; `checkIssueState` revalidation; `jarvisd github check` live-smoke command. Live smoke = blocked on user token (honest failure verified).

## Stack state

- Node 22.14, TS 5.9, zod 3.25, vitest 5.0.1, tsx 4.20. npm audit: 0 vulns.
- 88 tests / 11 files (~2s): protocol 20 + policy 22 + providers 33 + github 13.
- Packages: `@jarvis/protocol` (domain contracts), `@jarvis/policy` (14-rule engine), `@jarvis/providers` (adapters + secrets + router + failover), `@jarvis/github` (client + entities + ingestion + store + revalidation), `@jarvis/daemon` (CLI: version/check/health/github check/secret).
- ADRs: 0001–0006.

## Verified this session (exact commands, real outputs)

- `npm run typecheck` → 4/4 workspaces clean (now includes @jarvis/github)
- `npm test` → 88/88 passed
- `npm run daemon -- github check` → "no GitHub token configured. Set one: 'jarvisd secret set github:token'" + exit 1 (honest)
- `npm run daemon -- github` → usage text + exit 1

## Known pain points

- Same as prior sessions (OneDrive churn; PS 5.1 UTF-8 regex hazard; vitest 3→5 only).
- GitHub 403 handling nuance: 403 with `x-ratelimit-remaining: 0` maps to RATE_LIMITED (with backoff), otherwise AUTH_FAILURE — tested both.

## Next concrete steps

1. **WEEK-03**: candidate/opportunity model (8 explicit kinds), feed queue (small pre-fetch, lazy deep analysis), swipe persistence + why-not vocabulary, skill graph v0 (deterministic), hybrid ranker v0 with explainable records, diversity constraints. Read `weeks/WEEK-03.md`.
2. User: fine-grained PAT via `jarvisd secret set github:token` whenever ready → rerun `github check` for the live smoke (U3/#5).

## Docs health

All current; ADR 0006 added; PROJECT_STATUS/NEXT-TASKS/week files/state JSONs updated this session.
