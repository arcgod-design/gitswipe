# NEXT-TASKS.md — task board

> The authoritative ladder is `weeks/WEEK-00..12.md`. This board is the index; detailed scope/exit tests live in the week files. Update both when scope changes.

## Ladder status

| Week | Theme | Status |
|---|---|---|
| WEEK-00 | Foundation (docs, monorepo, protocol/policy/providers cores, daemon CLI) | ✅ DONE (2026-09-24) |
| WEEK-01 | Provider completeness + OS credential store | ✅ DONE (2026-09-24) |
| WEEK-02 | GitHub auth + ingestion | NEXT — current |
| WEEK-03 | Discovery feed + swipes + skill graph v0 | PENDING |
| WEEK-04 | AI opportunity engine + reference mode + radar | PENDING |
| WEEK-05 | Workstation daemon v1 (identity/pairing/transport/journal) | PENDING |
| WEEK-06 | AgentGateway + OpenCode adapter + worktrees + PR lifecycle | PENDING |
| WEEK-07 | Security integration (policy on exec path, broker, approvals, audit) | PENDING |
| WEEK-08 | Web UI (taste-skill pass) + Puter optional auth | PENDING |
| WEEK-09 | Android (Capacitor, notifications, offline, APK) | PENDING |
| WEEK-10 | Hardening (recovery, security fixtures, backpressure) | PENDING |
| WEEK-11 | Packaging + CI/CD + docs complete | PENDING |
| WEEK-12 | Master acceptance scenario + v1 ship | PENDING |

## WEEK-01 task list (✅ DONE 2026-09-24 — 75/75 tests)

| # | Task | Status | Notes |
|---|------|--------|-------|
| A1 | structuredOutput + embeddings across adapters with capability negotiation | ✅ DONE | retry once with stricter prompt (§142); embeddings index-sorted; router enforces capability |
| A2 | SecretStore interface + Windows Credential Manager impl (+ keychain/libsecret stubs) | ✅ DONE | DPAPI file store live-tested on win32; keychain/libsecret PROTO |
| A3 | Routing API surface (5 route keys + user overrides) + tests | ✅ DONE | `ModelRouter` + `authorizedChain` |
| A4 | Provider health command in daemon CLI (`jarvisd health`) | ✅ DONE | honest FAIL + exit 1; JARVIS_PROVIDERS=comma,list |
| A5 | Failover within user-authorized providers only + tests | ✅ DONE | AUTH_FAILURE never fails over; aggregate error lists all attempts |

## WEEK-02 task list (current)

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | GitHub auth decision: GitHub App vs OAuth App vs PAT (ADR 0006) | TODO | contract §2.2/§8 prefers App/scoped OAuth |
| B2 | REST client with pagination, conditional requests (ETag), backoff, rate-limit budget | TODO | contract §126 |
| B3 | Normalized entities (Repository, GitHubItem, health snapshot fields) zod-validated at boundary | TODO | contract §95, §189 |
| B4 | Ingestion into local candidate store (JSONL) | TODO | |
| B5 | Fixtures: closed/reopened issues, stale issues, rate-limit 429 responses, permission-changed tokens | TODO | contract §205 |
| B6 | Revalidation primitive: checkIssueState before task start | TODO | contract §10.4/§57 |

## Standing items (user-side)

| # | Item | Owner | Blocks |
|---|------|-------|--------|
| U1 | ~~Confirm product name~~ — RESOLVED: **GitSwipe** (ADR 0005) | — | — |
| U2 | License choice (MIT vs Apache-2.0) | USER | any public release (WEEK-11/12) |
| U3 | GitHub App/OAuth creds | USER | WEEK-02 live smoke (fixtures don't need it) |
| U4 | Puter app registration | USER | WEEK-08 optional path only |
| U5 | BYOK test keys into local `.env` (never paste into chats) | USER | WEEK-01 live smoke (mocks don't need it) |
| U7 | Designate workspace root folder for dispatched-task worktrees | USER | WEEK-06 setup |
