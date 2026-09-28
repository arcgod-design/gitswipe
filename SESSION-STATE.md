# SESSION-STATE.md — as of 2026-09-24 (docs sync + research pass complete)

## Current state

Dev ladder: WEEK-00..05 + 07 complete; WEEK-06 deterministic core done (live OpenCode tail open on U5 — BYOK key); WEEK-08 (production web UI) is NEXT. MVP track complete on mvp (pitchable demo). v0.3.1 on main, CI-verified. 168 tests, typecheck clean, 0 vulnerabilities. This session: created gitresearch.md (CLI-Anything deep dive + aws-backlog screening), then synced all stale docs.

## What was fixed this session (docs staleness audit)

- `docs/ARCHITECTURE.md`: monorepo layout listed 3 of 7 packages (github/discovery/agents/security missing); "agents lands WEEK-06" was stale; "deliberate non-choices" now records the LiteLLM zero-work verdict and the semgrep WEEK-11 park.
- `PROJECT-CORE.md`: architecture map listed 3 packages; now lists all 7 + the two-stage approval authorization.
- `docs/REPO-WORK-CONVENTIONS.md` §8: "WEEK-07 will enforce" -> the ExecutionGate IS shipped; WorktreeManager + pre-push gate runner are shipped; PR lifecycle loop is the remaining WEEK-06 item.
- `docs/MVP-PLAN.md`: merge rule now records what was absorbed (mock agent -> @jarvis/agents) vs what's pending (web UI -> WEEK-08).
- `CLAUDE.md`: gitresearch.md added to the read-first pointers.
- `NEXT-TASKS.md` + `USER-THING-TO-DO.md`: standing items refined — U3 (OAuth) superseded by ADR 0006; U5 split into provider key + GitHub PAT; U8 added (review the parked SUGGESTIONS items).
- `gitresearch.md`: created with the CLI-Anything deep dive (PARTIAL verdict) + the aws-backlog screen (~45 repos screened).

## Stack state

- Branch: dev. 168/168 tests, typecheck clean, audit 0. 9 packages. ADRs 0001-0008 (+0008 addendum). Releases: v0.1.0, v0.2.0, v0.2.1, v0.3.0, v0.3.1.

## Next concrete steps

1. **WEEK-08** (production web UI) is next per the ladder: mandatory taste-skill + ui-ux-pro-max design pass first (H1), then screens against the real daemon API, Puter optional auth last (H5).
2. User: BYOK key (U5) unblocks WEEK-06 live tail; GitHub PAT (U5b) for live smoke; review SUGGESTIONS parked items (U8).

## Docs health

All surfaces current: README, ARCHITECTURE (fixed), ROADMAP, PROJECT-CORE (fixed), PROJECT_STATUS, SESSION-STATE (this), NEXT-TASKS, USER-THING-TO-DO, REPO-WORK-CONVENTIONS (fixed), MVP-PLAN (fixed), CLAUDE.md, gitresearch.md, SUGGESTIONS.md, in-progress, daily logs 1-14, state JSONs 1-14.