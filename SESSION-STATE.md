# SESSION-STATE.md — as of 2026-09-24 (WEEK-04 complete)

## Current week

**WEEK-04** — ✅ **DONE (deterministic machinery).** Dedup classifier v0 (exact + lexical + metadata, never one signal), finding pipeline (evidence assembly → confidence gate 0.55 → duplicate trail on every FindingRecord; weak evidence labeled hypothesis; below-gate rejected with reason), analysis prompts (untrusted-content rule in every system prompt, fenced-JSON structured-output parser), reference mode (explicit reasons only), project radar (project candidates, TODO/FIXME scanner, repo-scoped dependabot advisories with source links). Live provider-analysis loop = daemon weeks (WEEK-05+).

## Stack state

- Node 22.14, TS 5.9, zod 3.25, vitest 5.0.1, tsx 4.20. npm audit: 0 vulns.
- 116 tests / 13 files (~2.2s): protocol 20 + policy 22 + providers 33 + github 13 + discovery 28.
- Packages: `@jarvis/protocol`, `@jarvis/policy`, `@jarvis/providers`, `@jarvis/github`, `@jarvis/discovery`, `@jarvis/daemon`.
- ADRs 0001–0006. All WEEK-00..04 scope shipped; WEEK-05 (daemon v1) is next.

## Verified this session (exact commands, real outputs)

- `npm run typecheck` → 5/5 workspaces clean
- `npm test` → 116/116 passed
- `npm audit` → 0 vulnerabilities

## Known pain points

- Test fixtures inheriting `language` from spread-base caused false reference matches — watch fixture spreads.
- Ranker ties: seed dominant weights; never assert tie-break order.
- Recurring machine hazards: OneDrive churn, PS 5.1 UTF-8 regex, vitest 3→5 only.

## Next concrete steps

1. **WEEK-05** (the big one): daemon becomes a real process — config precedence (§116), device identity + 10-min pairing codes → key exchange (§23), loopback+LAN TransportProvider + `jarvis-workstation/1.0` handshake (§24/§107), append-only JSONL event journal with replay-from-cursor (§120/§121), authenticated localhost API (§148), health + heartbeats (§88/§195), durable task queue (§111/§112). Read `weeks/WEEK-05.md`.
2. User whenever ready: PAT (`jarvisd secret set github:token`) + BYOK key → live smokes.

## Docs health

All current; daily log `2026-09-24-5.md`; state JSON `2026-09-24-5.json`.

## Branch model (ADR 0007 — live as of session 6, same day)

- `dev` = current branch + all future ladder work (session pushes target dev)
- `main` = verified merges only; baseline release tagged **v0.1.0** (WEEK-00..04)
- `mvp` = pitch/demo slice (branched from dev; demo shortcuts labeled per contract §201)
- Next merge to main = next verified milestone (WEEK-05 exit test green)
