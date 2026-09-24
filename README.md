# Jarvis

> Personal engineering agent network: **discover** GitHub work worth doing, **decide** via a swipe feed with evidence, **execute** on your own PC through agents like OpenCode, **supervise** everything from your phone or browser. Provider-agnostic AI (BYOK first-class, Puter optional, local models first-class). Self-hostable. Local-first.

**Status: WEEK-00 foundation.** This is an active build, not a finished product. The honest capability ledger lives in [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — read it before assuming anything works. The full product spec is the binding contract at [`docs/source/JARVIS_PRODUCTION_BUILD_PROMPT.md`](docs/source/JARVIS_PRODUCTION_BUILD_PROMPT.md).

## What exists right now (WORKING, tested)

- `@jarvis/protocol` — all domain contracts: event envelope + replay cursors, session/task state machines, task contracts (with embedded git-work rules), opportunity/swipe/evidence model, approval binding with action hashing, agent-gateway interfaces, workstation handshake.
- `@jarvis/policy` — deterministic policy engine: command/path/git rules, safe defaults, explainable decisions (enforced below any LLM — the model never decides security).
- `@jarvis/providers` — AIProvider abstraction + OpenAI-compatible & Anthropic adapters (covers OpenAI, OpenRouter, Ollama, Gemini-compat, generic base URLs), model routing, tested against local mock servers.
- `@jarvis/daemon` — workstation CLI entrypoint (grows into the full workstation per the week ladder).

## Roadmap (short version)

WEEK-01 providers+secrets → 02 GitHub → 03 discovery/swipes → 04 AI opportunities → 05 workstation daemon → 06 OpenCode gateway + PR lifecycle → 07 security enforcement → 08 web UI → 09 Android → 10 hardening → 11 packaging → 12 v1 acceptance. Full ladder with exit tests: [`docs/ROADMAP.md`](docs/ROADMAP.md) + [`weeks/`](weeks/).

## Development

```bash
npm install          # workspace links
npm run typecheck    # strict TS across all packages
npm test             # vitest suite (no API keys needed — mocks only)
npm run daemon -- version
npm run daemon -- check     # toolchain preflight-lite
```

Requires Node 22+. BYOK keys, when needed for live smoke tests, go in a local `.env` (gitignored) — never in chats, commits, or logs.

## Repository map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Session boot — read order + hard rules |
| `PROJECT-CORE.md` | Locked decisions + verified facts |
| `PROJECT_STATUS.md` | Honest WORKING/PROTO/ROADMAP ledger |
| `SESSION-STATE.md` | Where we are right now |
| `docs/` | VISION, ARCHITECTURE, ROADMAP, REPO-WORK-CONVENTIONS, source specs |
| `weeks/` | WEEK-00..12 ladder + memory protocol (resume without hallucinations) |
| `doc-of-journey/` | Daily log, ADRs, error/tactic catalogs |
| `packages/` | protocol, policy, providers |
| `apps/` | daemon (web app lands WEEK-08) |

## Contributing / license

Conventions in `CLAUDE.md`. **License: not yet chosen** — this repo must be treated as private until one is. Conventional commits; never commit secrets.
