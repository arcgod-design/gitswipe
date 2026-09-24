# NEXT-TASKS.md — task board

> The authoritative ladder is `weeks/WEEK-00..12.md`. This board is the index; detailed scope/exit tests live in the week files. Update both when scope changes.

## Ladder status

| Week | Theme | Status |
|---|---|---|
| WEEK-00 | Foundation (docs, monorepo, protocol/policy/providers cores, daemon CLI) | ✅ DONE (2026-09-24) |
| WEEK-01 | Provider completeness + OS credential store | ✅ DONE (2026-09-24) |
| WEEK-02 | GitHub auth + ingestion | ✅ DONE (2026-09-24; live smoke pending user token) |
| WEEK-03 | Discovery feed + swipes + skill graph v0 | ✅ DONE (2026-09-24) |
| WEEK-04 | AI opportunity engine + reference mode + radar | ✅ DONE (2026-09-24) |
| WEEK-05 | Workstation daemon v1 (identity/pairing/transport/journal) | ✅ DONE (2026-09-24; 129/129 dev tests + live cross-process pair verification) |
| WEEK-06 | AgentGateway + OpenCode adapter + worktrees + PR lifecycle | NEXT — current |
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

## WEEK-02 task list (✅ DONE 2026-09-24 — 88/88 tests; live smoke blocked on user token)

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | GitHub auth decision: GitHub App vs OAuth App vs PAT (ADR 0006) | ✅ DONE | fine-grained PAT in OS store; `GitHubAuth` interface ready for OAuth/App later |
| B2 | REST client with pagination, conditional requests (ETag), backoff, rate-limit budget | ✅ DONE | Link-header pagination, If-None-Match/304, Retry-After + X-RateLimit-Reset backoff |
| B3 | Normalized entities (Repository, GitHubItem, health snapshot fields) zod-validated at boundary | ✅ DONE | incl. stale detection + PR/issue separation |
| B4 | Ingestion into local candidate store (JSONL) | ✅ DONE | upsert preserves first_seen_at, atomic tmp+rename writes |
| B5 | Fixtures: closed/reopened issues, stale issues, rate-limit 429 responses, permission-changed tokens | ✅ DONE | all in vitest vs mock server |
| B6 | Revalidation primitive: checkIssueState before task start | ✅ DONE | open/closed/not_found/permission_denied |

## WEEK-03 task list (✅ DONE 2026-09-24 — 99/99 tests repo-wide)

| # | Task | Status | Notes |
|---|------|--------|-------|
| C1 | Candidate/opportunity model wired to ingestion: 8 explicit kinds (contract §9.1) | ✅ DONE | EXISTING_ISSUE + STALE_ISSUE classified from live data; AI/reference kinds join via the same `OpportunityKind` in WEEK-04 — never one opaque type |
| C2 | Feed API: pre-fetched swipe queue (small, lazy deep analysis), staleness timestamps | ✅ DONE (engine) | `buildFeedPage` produces the full page; HTTP serving lands with the daemon in WEEK-05; deep analysis is WEEK-04 and stays lazy by design |
| C3 | Swipe persistence + feedback vocabulary (§9.3) + why-not reasons | ✅ DONE | JSONL store, zod-validated actions |
| C4 | Skill graph v0: explicit skills + GitHub history + swipe signal, deterministic scoring | ✅ DONE | right +3, wrong-stack → zero match; embeddings later |
| C5 | Hybrid ranker v0: deterministic features + user-history signals, explainable ranking records | ✅ DONE | skill/clarity/freshness/saved-similarity + reasons per card |
| C6 | Diversity constraints (language/repo/difficulty) + card contract fields | ✅ DONE | caps push overflow to whyNot with an explicit diversity reason |

## WEEK-04 task list (✅ DONE 2026-09-24 — 116/116 tests repo-wide)

| # | Task | Status | Notes |
|---|------|--------|-------|
| D1 | Dedup classifier v0: exact duplicate + lexical/semantic-candidate detection (contract §11, embeddings later) | ✅ DONE | normalized-title exact + token-Jaccard + repo/label metadata; embeddings join post-v1 behind the same interface |
| D2 | Finding pipeline: candidate → evidence assembly → confidence gate (§10.2/§10.3, §168) | ✅ DONE | weak evidence → hypothesis; below-gate rejected with reason; duplicate trail on every record |
| D3 | AI analysis prompts behind provider routing (§7.2) — structured output + model/version stamps | ✅ DONE (prompts + parser) | prompt templates + fenced-JSON parse validated; the live provider loop is daemon work (WEEK-05+) |
| D4 | Revalidation-before-work wiring: cited code exists, issue still open (§10.4/§57) | ✅ DONE | checkIssueState (WEEK-02) + duplicate_status trail recorded |
| D5 | Reference mode: separate WORK vs REFERENCE feeds, explicit relevance reasons (§12, §169) | ✅ DONE | no-reason refs filtered entirely |
| D6 | Project radar foundations: registered projects, radar item types (§13) | ✅ DONE | project candidates + TODO scanner + repo-scoped dependabot advisories (source links, never invented) |

## WEEK-05 task list (dev ladder — the mvp branch pulls E3/E4/E5 forward in minimal form per docs/MVP-PLAN.md, in parallel)

| # | Task | Status | Notes |
|---|------|--------|-------|
| E1 | Daemon as a long-running process: config precedence (§116), structured logs, `serve` becomes real | TODO | replaces the honest placeholder |
| E2 | Device identity: durable keypair + id; short-lived pairing codes → key exchange → revocable identities (§23) | TODO | pairing code never becomes the credential |
| E3 | Transport v1: LocalLoopback + LAN behind TransportProvider; outbound-only; versioned handshake `jarvis-workstation/1.0` (§24/§107) | TODO | |
| E4 | Event journal: append-only JSONL, monotonic sequence, replay-from-cursor + snapshot-on-gap (§120/§121) | TODO | protocol envelope from WEEK-00 |
| E5 | Localhost API: authenticated loopback session token, CORS/origin locked (§148/§149) | TODO | |
| E6 | Health report + heartbeats (§88/§195) + task queue durability (§111/§112) | TODO | |

## MVP track (parallel — branch `mvp`, plan in docs/MVP-PLAN.md, locked PROJECT-CORE #23)

| # | Task | Status | Notes |
|---|------|--------|-------|
| M1 | Minimal daemon serve: loopback HTTP + loopback token + feed/swipe/contract API over the real engines | TODO | pulls WEEK-05 E3/E5 forward |
| M2 | Event journal + SSE with replay + deterministic mock agent (contract §202 script) | TODO | pulls E4 + WEEK-06 mock |
| M3 | **Taste-skill + ui-ux-pro-max design pass** → swipe feed + contract view + session screen + approval card | TODO | mandatory per PROJECT-CORE #15/#23; no UI code before the pass |
| M4 | Demo data fixtures + DEMO badge + demo-reset; isolation from real creds (§201) | TODO | |

## Standing items (user-side)

| # | Item | Owner | Blocks |
|---|------|-------|--------|
| U1 | ~~Confirm product name~~ — RESOLVED: **GitSwipe** (ADR 0005) | — | — |
| U2 | License choice (MIT vs Apache-2.0) | USER | any public release (WEEK-11/12) |
| U3 | GitHub App/OAuth creds | USER | WEEK-02 live smoke (fixtures don't need it) |
| U4 | Puter app registration | USER | WEEK-08 optional path only |
| U5 | BYOK test keys into local `.env` (never paste into chats) | USER | WEEK-01 live smoke (mocks don't need it) |
| U7 | Designate workspace root folder for dispatched-task worktrees | USER | WEEK-06 setup |
