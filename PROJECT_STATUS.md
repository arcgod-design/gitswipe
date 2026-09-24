# PROJECT_STATUS.md — honest capability ledger

> Contract §1.9: never claim a capability works until it is executable and tested.
> Labels: **WORKING** (code + tests green + runnable), **PROTO** (real code, untested against live service), **ROADMAP** (not built, scheduled).
> Update this file whenever a label changes. If it is not listed, assume it does not exist.

## WORKING

| Capability | Where | Verified by |
|---|---|---|
| Domain contracts: event envelope, session/task state machines, task contract + markdown render, opportunity/swipe model, approval + action hashing, workstation handshake | `packages/protocol` | vitest: `npm test` |
| Deterministic policy engine: rule evaluation, command classification (git/read/build/network), path sandbox checks (traversal, blocked paths, windows drives) + default safe ruleset (contract §26) | `packages/policy` | vitest: table-driven tests (contract §118) |
| AI provider abstraction: OpenAI-compatible chat/stream/listModels/healthCheck/embeddings (OpenAI, OpenRouter, Ollama, Gemini-compat), Anthropic chat/stream, registry presets, retry/rate-limit/typed error categories | `packages/providers` | vitest against local mock HTTP servers (no live keys used or needed) |
| BYOK secret store: `SecretStore` interface + Windows DPAPI file store (user-scoped; live round-trip proves plaintext never touches disk) + key resolution os-store > env(dev-flagged) > none | `packages/providers/src/secret-store.ts`, `key-resolver.ts` | vitest (live DPAPI, win32) + manual daemon round-trip |
| Structured-output retry (one stricter retry, contract §142) + capability negotiation (embeddings enforced at the router) | `packages/providers` | vitest |
| ModelRouter: 5 route keys, user overrides, authorized chains — primary first, only user-listed failovers, unauthorized primary rejected | `packages/providers/src/router.ts` | vitest |
| Authorized-only failover: RATE_LIMITED/PROVIDER_FAILURE/TIMEOUT/NETWORK_FAILURE fail over within the user chain; AUTH_FAILURE never fails over (bad keys surface); aggregate error lists every attempt | `packages/providers/src/failover.ts` | vitest |
| Typed transport errors: hanging endpoint → `[TIMEOUT]`, refused → `[NETWORK_FAILURE]`; malformed SSE lines skipped without killing the stream | `packages/providers` | vitest |
| GitHub client: pagination (Link header), conditional ETag requests (304), 429/403 backoff honoring Retry-After/X-RateLimit-Reset, rate-budget tracking, typed error mapping (401→AUTH, exhausted 403/429→RATE_LIMITED, 404→GITHUB_STATE_CHANGED) | `packages/github/src/client.ts` | vitest vs local mock server |
| GitHub auth: fine-grained PAT via OS secret store > env(dev-flagged) (ADR 0006); `GitHubAuth` interface for future OAuth-device/App adapters | `packages/github/src/auth.ts` | vitest + `jarvisd github check` (honest no-token failure verified) |
| Normalized entities (Repository/Issue/PR) zod-validated at boundary; stale detection (>90d untouched open); PR-in-issues-list separation | `packages/github/src/entities.ts` | vitest with contract §205 fixtures |
| JSONL candidate store: append/upsert (first_seen preserved on update, last_sync bumped), tmp+rename atomic writes | `packages/github/src/store.ts` | vitest |
| Ingestion + revalidation: repo fetch, issues/PRs ingest with counts (issues/PRs/stale), `checkIssueState` (open/closed/not_found/permission_denied) before any task start | `packages/github/src/ingest.ts` | vitest |
| Daemon CLI: `version` / `check` (preflight) / `health` (provider health — honest FAIL + exit 1) / `github check` (token + /user + rate budget) / `secret set|get|list|delete` (DPAPI-backed, masked display) | `apps/daemon` | manual runs 2026-09-24 |
| Monorepo toolchain: npm workspaces, TS strict, vitest 5, CI workflow | root + `.github/workflows/ci.yml` | `npm run typecheck` + `npm test` green (75/75) |
| Session-resume documentation system (this file + SESSION-STATE + weeks + doc-of-journey) | repo root | n/a — process, verified by use |

## PROTO

| Capability | Where | Why not WORKING yet |
|---|---|---|
| macOS Keychain + Linux libsecret secret stores | `packages/providers/src/secret-store.ts` | Code is real but untestable on this Windows machine; first darwin/linux use must be verified live. (Windows DPAPI store IS WORKING.) |
| Puter client-side AIProvider bridge (injected puter object, chat only) | `packages/providers/src/puter.ts` | Needs the browser puter.js runtime; wired and tested in WEEK-08. Never a daemon-side dependency. |
| Daemon as a long-running process (identity, pairing, transport, journal) | `apps/daemon` | Skeleton only — WEEK-05 builds it. `serve` explicitly reports not-implemented. |
| Live provider smoke against real APIs (OpenAI/Ollama/etc.) | — | Needs BYOK key in `.env` or OS store (USER-THING-TO-DO #5). All current tests use local mock servers by design. |
| Live GitHub smoke (real token → /user → live repo ingest) | `jarvisd github check` path | Needs a fine-grained PAT in the OS store (USER-THING-TO-DO #5/U3). Fixture-driven tests fully green; the live path prints honest no-token failure today. |

## ROADMAP (scheduled, contract sections in parens)

- GitHub auth + ingestion: repos/issues/PRs, rate-limit handling (§8, §126) — WEEK-02
- Discovery feed, swipe persistence, skill graph v0, diversity, "why this/why not" (§9, §14, §15, §78, §128) — WEEK-03
- AI opportunity engine: repo analysis, evidence assembly, dedup pipeline, confidence gate, Reference mode, Project Radar (§10–§13) — WEEK-04
- Workstation daemon v1: device identity, pairing codes, loopback+LAN transport, event journal, health (§22, §23, §107) — WEEK-05
- AgentGateway + OpenCode adapter (HTTP/SSE → CLI fallback), mock agent, worktrees, follow-up/pause/resume/takeover (§17–§19, §29, §30) — WEEK-06
- Security integration: policy enforcement on the exec path, credential broker, approval queue + replay protection, audit journal, redaction (§25–§28, §58, §74, §114) — WEEK-07
- Web UI (taste-skill + ui-ux-pro-max pass): discover/swipe/sessions/approvals, event replay client, Puter auth optional path (§35, §36) — WEEK-08
- Android via Capacitor: secure storage, notifications, offline cache, debug APK (§38) — WEEK-09
- Hardening: reconnect/replay E2E, recovery, checkpoints, security fixtures (prompt injection, traversal), backpressure (§21, §32–§34, §62, §196) — WEEK-10
- Packaging + CI/CD: Windows/macOS/Linux installers, release pipeline, docs complete (§37, §63, §101) — WEEK-11
- Master acceptance scenario (§215) + release checklist (§207) — WEEK-12

## Explicitly NOT built (and not scheduled before its week)

Database (migrations land with the daemon journal in WEEK-05 — JSONL journal first), Puter Workers/shared index (post-v1, needs ADR), Harness adapter (WEEK-06 interface only), Tailscale transport (optional, post-v1), relay service.
