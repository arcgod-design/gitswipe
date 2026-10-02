# GitSwipe

> Personal engineering agent network: **discover** GitHub work worth doing, **decide** via a swipe feed with evidence, **execute** on your own PC through agents like OpenCode, **supervise** everything from your phone or browser. Provider-agnostic AI (BYOK first-class, Puter optional, local models first-class). Self-hostable. Local-first. (Internal codename: Jarvis — you'll see it in package names and the wire protocol.)

**Status: dev ladder WEEK-00..05 + 07 + 08 complete, WEEK-06 deterministic core done (live OpenCode tail pending a BYOK key). 171 tests, CI-verified on Linux runners. The production web UI is live-verified end-to-end: pair → feed → swipe → session → approve → COMPLETED, all in the browser against the real daemon.** This is an active build, not a finished product. The honest capability ledger lives in [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — read it before assuming anything works. The full product spec is the binding contract at [`docs/source/JARVIS_PRODUCTION_BUILD_PROMPT.md`](docs/source/JARVIS_PRODUCTION_BUILD_PROMPT.md). Releases: `v0.1.0` engines → `v0.2.0` workstation daemon → `v0.3.1` agent gateway + security → `v0.4.0` production web UI.

## What exists right now (WORKING, tested)

- `@jarvis/protocol` — domain contracts: versioned event envelope + replay cursors, session/task state machines (illegal transitions throw — they caught two real bugs), task contracts with the ssoc git-work rules embedded, opportunity/swipe/evidence model, approvals with canonical-JSON action hashing, decision **and** execution authorization (`verifyGrantedApproval` binds actor/session/task/policy-version, explicit `consumed` state), workstation handshake.
- `@jarvis/policy` — deterministic policy engine: §118 command table, path sandbox (traversal/blocked-secret-paths/windows drives), safe default (unmatched → ask, never silent allow). The LLM never decides security.
- `@jarvis/providers` — AIProvider abstraction: OpenAI-compatible + Anthropic adapters (OpenAI/OpenRouter/Ollama/Gemini-compat/generic), embeddings, structured-output retry, authorized-only failover (bad keys surface, never hide), **Windows DPAPI secret store** (live-tested; keychain/libsecret coded), model routing.
- `@jarvis/github` — REST client with Link pagination, conditional ETags, 429/403 backoff + rate-budget tracking; fine-grained-PAT auth (ADR 0006); zod-normalized entities with stale detection; JSONL candidate store; `checkIssueState` revalidation.
- `@jarvis/discovery` — the engine behind the swipe feed: explainable ranker (skill/clarity/freshness), why-not + show-anyway, diversity caps, skill graph v0 (swipes measurably change the next ranking), dedup classifier (never one signal alone), finding pipeline with evidence + confidence gates, reference mode, project radar, untrusted-content prompt framing.
- `@jarvis/agents` — AgentGateway (§19 state machine, real approval bindings, follow-up/pause/resume/stop), worktree manager per REPO-WORK-CONVENTIONS (one issue = one worktree, `feat/issue-N-slug` branches), checkpoints, deterministic mock agent, OpenCode dispatch conventions (`opencode run --dir/--title` + takeover via `opencode session resume`).
- `@jarvis/security` — the execution gate (§118 enforced in real execution paths: allowed commands really run, force-push denied+audited, approved commands execute exactly once with context binding, forgery/replay/expiry/policy-drift all refused), credential broker (lease→redeem, token vended once, hashes-only audit), append-only audit journal, redaction (11 secret families, wired into the journal — live-proofed).
- `@jarvis/daemon` — the workstation: `serve` (loopback default, origin-locked, device-token auth; wires the production feed engine + session manager and serves the web UI), `pair` (single-use 10-min codes shared across processes), `devices list/revoke` (revocation kills live tokens), `health`, `github check`, `secret set/get` (DPAPI-backed), `demo` (the pitch demo).
- `apps/web` — the production UI (React + Vite): pairing screen, swipe feed (keyboard nav, explainable reasons), session supervision (live SSE, DENY/APPROVE card), workstation report. Builds into `apps/daemon/public`; served by `serve`. Design system: slate-900 dark, green accent, Space Grotesk/DM Sans/JetBrains Mono, phosphor icons.

## Roadmap (short version)

~~01 providers+secrets~~ ~~02 GitHub~~ ~~03 discovery/swipes~~ ~~04 AI opportunities~~ ~~05 workstation daemon~~ **06 OpenCode gateway** (deterministic core done; live tail pending BYOK) ~~07 security enforcement~~ ~~08 web UI~~ → **09 Android (current)** → 10 hardening → 11 packaging → 12 v1 acceptance. Full ladder with exit tests: [`docs/ROADMAP.md`](docs/ROADMAP.md) + [`weeks/`](weeks/).

## Pitch demo

The `mvp` branch carries a complete pitch demo (`docs/MVP-PLAN.md`): `npm install && npm run build:web && npm run demo` → swipe feed → task contract → live mock-agent session with the real approval gate → PR-draft summary → demo reset. Fixture data only, clearly labeled, isolated from real credentials.

## Development

```bash
npm install          # workspace links
npm run typecheck    # strict TS across all packages
npm test             # vitest suite (no API keys needed — mocks only)
npm run daemon -- check        # toolchain preflight
npm run daemon -- serve        # workstation service (loopback:7420)
npm run daemon -- pair         # issue a single-use pairing code
```

Requires Node 22+. BYOK keys, when needed for live smoke tests, go in a local `.env` (gitignored) — never in chats, commits, or logs. CI runs the full suite on Linux (`npm test` must stay green there — fixture repos set their own git identity).

## Repository map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Session boot — read order + hard rules |
| `PROJECT-CORE.md` | Locked decisions (ADR-indexed) + verified facts |
| `PROJECT_STATUS.md` | Honest WORKING/PROTO/ROADMAP ledger |
| `SESSION-STATE.md` | Where we are right now |
| `docs/` | VISION, ARCHITECTURE, ROADMAP, REPO-WORK-CONVENTIONS, MVP-PLAN, source specs |
| `gitresearch.md` | External-repo research index — every proposed repo gets a verdict (USE/PARTIAL/SKIP) + deep dive when earned |
| `weeks/` | WEEK-00..12 ladder + memory protocol (resume without hallucinations) |
| `doc-of-journey/` | Daily logs, ADRs 0001–0008, error/tactic catalogs |
| `packages/` | protocol, policy, providers, github, discovery, agents, security |
| `apps/` | daemon (production web app lands WEEK-08; pitch UI on `mvp`) |

## Branch model (ADR 0007)

`dev` = all development · `main` = verified, tagged releases only (protected: no force-push) · `mvp` = the pitch/demo slice. Milestones merge dev→main with `--no-ff` + a `vX.Y.Z` tag.

## Contributing / license

Conventions in `CLAUDE.md`. **License: not yet chosen** — this repo must be treated as private until one is. Conventional commits; never commit secrets.
