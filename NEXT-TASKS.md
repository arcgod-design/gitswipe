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
| WEEK-05 | Workstation daemon v1 (identity/pairing/transport/journal) | ✅ DONE (2026-09-24; live cross-process pair verification) |
| WEEK-06 | AgentGateway + OpenCode adapter + worktrees + PR lifecycle | 🔶 PARTIAL (2026-09-24) — deterministic core done (13 tests, real worktrees); live OpenCode tail + PR watch loop open on U5 (BYOK key) |
| WEEK-07 | Security integration (policy on exec path, broker, approvals, audit) | ✅ DONE (2026-09-24; §118 enforced in real execution paths, live redaction proof, 21 tests) |
| WEEK-08 | Web UI (taste-skill pass) + Puter optional auth | ✅ DONE (2026-10-01; live-verified: UI→pair→feed→swipe→session→approve→COMPLETED; H4 view-only, H5 Puter PROTO — non-blockers) |
| WEEK-09 | Android (Capacitor, notifications, offline, APK) | NEXT — current |
| WEEK-10 | Hardening (recovery, security fixtures, backpressure) | PENDING |
| WEEK-11 | Packaging + CI/CD + docs complete | PENDING |
| WEEK-12 | Master acceptance scenario + v1 ship | PENDING |

## 4-day demo plan (locked 2026-10-04 — show date ~2026-10-08; "fully working setup" per user)

> The ma'am needs a working prototype. The WEEK ladder still holds (09=Android, 10=hardening, 11=packaging, 12=acceptance) — the D-plan is that ladder compressed onto the calendar. Real GitHub dispatch stays fixture/mock-driven until the user's PAT lands (U5b).

| Day | Date | Scope | Status |
|---|---|---|---|
| D1 | 2026-10-04 | BYOK on the app (H4): provider select + key store/remove/test, all via the daemon API into the OS secret store · workspace root (user folder or auto-created default) · nvidia-nim preset + live smoke (nemotron replied [OK]) · self-learning v1.5 design locked (below) | ✅ DONE (180/180 tests, live-verified) |
| D2 | 2026-10-05 | **Self-learning v1.5** (below — demo differentiator) · Capacitor: init, wrap the web UI, secure storage for the device token, LAN pairing to the daemon | 🔜 NEXT |
| D3 | 2026-10-06 | Android debug APK (physical phone via USB per user choice; emulator fallback) · **Tailscale transport (user-selected: true internet)** — tailnet IP on laptop + phone, daemon binds the tailnet interface, origin-allowlist extension in the server config (currently hardcoded to loopback origins), phone app pointed at the tailnet URL — note: this is Tailscale-as-network-layer for the demo, NOT the §24 transport-provider integration (that stays post-v1) · hardening: no-hidden-retry audit of `@jarvis/github` write paths (OpenMuse rule), reconnect/replay E2E, Lighthouse pass |

### User's pre-D3 checklist (from their answers, 2026-10-04)

1. Android Studio SDK Tools: update Build-Tools 37 + Platform-Tools 37.0.1, install **Command-line Tools (latest)** + **Google USB Driver** (+ Emulator hypervisor driver as fallback) — API 34 platform already installed.
2. Phone: USB debugging ON, plug into the laptop.
3. GitHub fine-grained PAT via `npm run daemon -- secret set github:token` (stdin — never in chat). Scopes: Metadata/Issues/Pull requests, read-only.
4. Tailscale: install on laptop + phone, same account, note the laptop's 100.x.y.z tailnet IP.
| D4 | 2026-10-07 | Rehearsal: full walkthrough script (pair → feed → swipe → show the learning change the ranking → session → approve → COMPLETED → phone if APK ready), demo data seeding, backup recording, docs |

### Self-learning v1.5 (D2 — the demo differentiator; deterministic + explainable, contract §9/§14)

Current v0: language weights from history + swipes (right boosts, wrong-stack zeroes), "learned from activity" framing. v1.5 upgrades, in priority order:

1. **Outcome feedback loop — the big one.** Today the graph learns from *swipes* (intent). v1.5 makes it learn from *outcomes*: when a session reaches COMPLETED, boost the language/topic weights of the card that produced it, slightly decay on FAILED. This closes Execute → Discover — GitSwipe learns from what you actually finish, not just what you liked. No competitor does this. Small: one function next to `applySwipe`, one journal event, tests proving a completed session measurably changes the next ranking (the WEEK-03 exit-test pattern, replayed on outcomes).
2. **Topic tags, not just languages.** Skill graph gains topic keywords (labels + title tokens: "parser", "auth", "css"). Right-swipe on a Rust parser card boosts Rust AND parsers. Keeps the explainable reasons ("matches your parser work").
3. **Recency decay.** Half-life on swipe weights so the feed tracks current interests, not all-time history. One exponent, tested.
4. *(stretch)* **Fast-skip dampener.** 3+ consecutive left-swipes on similar cards temporarily dampen that similarity — a diversity nudge with an honest reason string.

Post-v1 (parked in SUGGESTIONS): embeddings-based saved-similarity (NVIDIA endpoint already exposes `nvidia/nemotron-3-embed-1b` — our provider embeddings capability can use it), per-repo affinity scores, why-not reading feedback.

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

## WEEK-06 task list (deterministic core ✅ DONE 2026-09-24; live tail open)

| # | Task | Status | Notes |
|---|------|--------|-------|
| Core | AgentAdapter contract + session-title convention + MockAgentAdapter (state-machine-legal) + AgentGateway (approval binding, follow-up, pause/resume, stop) | ✅ DONE | `@jarvis/agents`; 13 tests; the protocol state machine caught the RUNNING→COMPLETED skip a second time |
| Core | WorktreeManager + CheckpointStore + OpenCodeAdapter conventions (`opencode run --dir/--title/--model`, takeover note) | ✅ DONE | per ADR 0008 + user research addendum |
| G-live | Wire OpenCodeAdapter runtime paths + session resume follow-ups against a live `opencode` server | BLOCKED(U5) | needs a machine with opencode + BYOK key; runtime paths stay PROTO and refuse to pretend |
| G-pr | PR-lifecycle watch loop (gh CLI: CI state, mergeable, CodeRabbit resolution queue, maintainer-blocked ledger) | TODO | after G-live |

## WEEK-07 task list (✅ DONE 2026-09-24 — 26 security tests + live proofs; CI-verified on Linux after the fixture-identity fix)

| # | Task | Status | Notes |
|---|------|--------|-------|
| F1 | Policy engine on the exec path | ✅ DONE | `ExecutionGate`: §118 in real execution; ALLOW really runs, DENY audited+blocked |
| F2 | Credential broker | ✅ DONE | lease→redeem; token vended once, action-bound; hashes-only audit |
| F3 | Approval queue replay protection | ✅ DONE | `verifyGrantedApproval` (§162) with execution-context binding (§58: actor/session/task/policy-version); explicit `consumed` state — state-based replay protection; forgery/replay/expiry/drift/context all refused; failed executions also consume |
| F4 | Audit journal | ✅ DONE | append-only, monotonic, restart continuation (§114) |
| F5 | Redaction | ✅ DONE | 11 families, nested payloads, withhold ≥2; wired into WorkstationJournal (live-proofed); fixtures built from fragments (secret-scanner-safe) |
| F-ci | CI-green on Linux runners | ✅ DONE | root cause: fixture repo lacked local git identity (gate-executed commits died exit 128 on identity-less runners); fixtures now self-contained; assertion diagnostics added |

## WEEK-08 task list (current)

| # | Task | Status | Notes |
|---|------|--------|-------|
| H1 | **Taste-skill + ui-ux-pro-max design pass** for the production UI (all screens) | TODO | mandatory per PROJECT-CORE #15; no UI code before the pass |
| H2 | Feed/discover screens against the real daemon API (cursor replay client) | TODO | |
| H3 | Session supervision screen (event stream, approvals, takeover w/ resume command) | TODO | |
| H4 | BYOK settings, GitHub connect, security preferences screens | TODO | |
| H5 | Puter optional auth path (client-side puter.js; core never requires it) | TODO | verify current docs at build time |

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
| U1 | ~~Confirm product name~~ — **RESOLVED: GitSwipe** (ADR 0005) | — | — |
| U2 | License choice (MIT vs Apache-2.0) | USER | any public release (WEEK-11/12) |
| U3 | ~~GitHub OAuth creds~~ — **superseded by ADR 0006** (fine-grained PAT is v1 auth) | — | — |
| U4 | Puter app registration (app UID + origin) | USER | WEEK-08 optional path only |
| U5 | **BYOK test key** (any provider) in local `.env` or OS store — never pasted into a chat | USER | WEEK-01 live provider smoke + **WEEK-06 live OpenCode tail** |
| U5b | **GitHub fine-grained PAT** via `jarvisd secret set github:token` | USER | live GitHub smoke (fixtures/tests don't need it) |
| U6 | Android SDK path configured (WEEK-09 Capacitor builds) | USER | WEEK-09 |
| U7 | Designate the contribution workspace root folder (like ssoc, but GitSwipe-owned) | USER | WEEK-06 setup |
| U8 | Review the parked SUGGESTIONS.md items (semgrep gate, worktree tool manifest, CLI-Anything wishlist source, patchwork/OpenHands adapters) — promote or kill each | USER | post-v1 planning |
