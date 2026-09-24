# ADR 0007 — Branch model: dev → main (releases), mvp (pitch/demo)

Date: 2026-09-24
Status: LOCKED (user directive)

## Decision

Three branches, strict roles:

| Branch | Role | Rules |
|---|---|---|
| **dev** | All development. The WEEK ladder (00–12) lives and lands here. | Direct commits allowed (solo dev). Every session-end push targets dev per memory-protocol. Verification bar = typecheck 5/5 + full test suite green + week exit test recorded. |
| **main** | Release versions only. | Updated ONLY by verified merges from dev (never direct commits, never force-push). Every merge = a tagged release (`vX.Y.Z`). Baseline tag: `v0.1.0` = WEEK-00..04 foundation (116/116 tests). |
| **mvp** | Pure MVP for pitch and examples. | Branched from dev. Carries the demo slice only. Demo shortcuts must be explicit and labeled demo mode (contract §201: obvious, isolated, never operating on real repos with real creds by accident). Merges into dev only when a demo feature reaches production grade. |

## Workflow

1. Work on `dev` (WEEK ladder commits).
2. Milestone complete + verified → `git checkout main && git merge --no-ff dev` + `git tag vX.Y.Z` + push.
3. Pitch/demo work happens on `mvp`; the demo must run on the real engines (no fake buttons — demo data is fixtures, clearly labeled).
4. CI runs on all three branches; a red build on dev blocks the next merge to main (the verification is manual-by-bar, enforced by discipline + CI evidence).

## Consequences

- `main` is always shippable/showable — safe to hand to outsiders and pitches as "the release".
- `mvp` can move fast without polluting the production ladder with demo shortcuts.
- History is never rewritten on `main`; dev history stays linear-ish with conventional commits.
- GitHub default branch stays `main` (what visitors see = releases). Branch protection on main (no force-push, no delete) — applied if the API allows; else documented as a manual step.
