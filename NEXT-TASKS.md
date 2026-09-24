# NEXT-TASKS.md — task board

> The authoritative ladder is `weeks/WEEK-00..12.md`. This board is the index; detailed scope/exit tests live in the week files. Update both when scope changes.

## Ladder status

| Week | Theme | Status |
|---|---|---|
| WEEK-00 | Foundation (docs, monorepo, protocol/policy/providers cores, daemon CLI) | ✅ DONE (2026-09-24) |
| WEEK-01 | Provider completeness + OS credential store | NEXT — current |
| WEEK-02 | GitHub auth + ingestion | PENDING |
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

## WEEK-01 task list (next up)

| # | Task | Status | Notes |
|---|------|--------|-------|
| A1 | structuredOutput + embeddings across adapters with capability negotiation | TODO | contract §141/§142 |
| A2 | SecretStore interface + Windows Credential Manager impl (+ keychain/libsecret stubs) | TODO | contract §7.3; `.env` = dev-only fallback, flagged |
| A3 | Routing API surface (5 route keys + user overrides) + tests | TODO | contract §7.2 |
| A4 | Provider health command in daemon CLI (`jarvisd --health`) | TODO | contract §109 |
| A5 | Failover within user-authorized providers only + tests | TODO | contract §110 — never silent provider switching |

## Standing items (user-side)

| # | Item | Owner | Blocks |
|---|------|-------|--------|
| U1 | Confirm product name: "Jarvis" vs "GitSwipe" | USER | branding WEEK-08+ |
| U2 | License choice (MIT vs Apache-2.0) | USER | any public release (WEEK-11/12) |
| U3 | GitHub App/OAuth creds | USER | WEEK-02 live smoke (fixtures don't need it) |
| U4 | Puter app registration | USER | WEEK-08 optional path only |
| U5 | BYOK test keys into local `.env` (never paste into chats) | USER | WEEK-01 live smoke (mocks don't need it) |
