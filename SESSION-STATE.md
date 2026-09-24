# SESSION-STATE.md — as of 2026-09-24 (WEEK-03 complete)

## Current week

**WEEK-03** — ✅ **DONE.** Discovery engine: candidate classification (EXISTING_ISSUE/STALE_ISSUE live; AI kinds join in WEEK-04 behind the same model), swipe store (§9.3 vocabulary), skill graph v0 (swipe-driven weights), explainable hybrid ranker v0 (skill/clarity/freshness/saved-similarity + whyNot + showAnyway), diversity caps, schema-validated feed cards. The exit test — a right-swipe measurably changes the next ranking — is green.

## Stack state

- Node 22.14, TS 5.9, zod 3.25, vitest 5.0.1, tsx 4.20. npm audit: 0 vulns.
- 99 tests / 12 files (~2s): protocol 20 + policy 22 + providers 33 + github 13 + discovery 11.
- Packages: `@jarvis/protocol`, `@jarvis/policy`, `@jarvis/providers`, `@jarvis/github`, `@jarvis/discovery`, `@jarvis/daemon` (CLI: version/check/health/github check/secret).
- ADRs 0001–0006.

## Verified this session (exact commands, real outputs)

- `npm run typecheck` → 5/5 workspaces clean (discovery included)
- `npm test` → 99/99 passed
- `npm audit` → 0 vulnerabilities

## Known pain points

- Ranker ties: stable sort keeps candidate order on equal scores — tests must not assume tie-breaks; seed dominant weights for deterministic scenarios.
- Same recurring machine hazards (OneDrive churn, PS 5.1 UTF-8 regex, vitest 3→5 only).

## Next concrete steps

1. **WEEK-04**: dedup classifier v0 (exact + lexical candidate signals, embeddings later — contract §11), finding pipeline (evidence assembly + confidence gate + §168 quality checklist, weak evidence → hypothesis), AI analysis prompts behind model routing (mock-tested), revalidation wiring, reference mode, radar foundations. Read `weeks/WEEK-04.md`.
2. User whenever ready: PAT via `jarvisd secret set github:token` → `github check` live smoke.

## Docs health

All current; PROJECT_STATUS/NEXT-TASKS/week files/state updated this session; daily log `2026-09-24-4.md`.
