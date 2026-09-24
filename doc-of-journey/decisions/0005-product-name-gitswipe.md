# ADR 0005 — Product name: GitSwipe (public) / Jarvis (internal codename)

Date: 2026-09-24
Status: LOCKED (user decision)

## Decision

- **Public product name: GitSwipe** (matches the repo `arcgod-design/gitswipe`). All user-facing surfaces use it: README, VISION, app UI (WEEK-08), task contracts sent to agents (`GITSWIPE TASK CONTRACT`).
- **"Jarvis" remains the internal codename** — kept deliberately, not renamed:
  - package names `@jarvis/protocol|policy|providers|daemon`
  - wire protocol id `jarvis-workstation/1.0`
  - `JarvisSession`, `JarvisError`, event/type names in `@jarvis/protocol`
  - historical doc references (the source contract `docs/source/JARVIS_PRODUCTION_BUILD_PROMPT.md` is a historical spec — untouched)
- Renaming the internal identifiers would be mechanical churn with zero user value and a breaking wire-protocol change; do NOT do it without a new ADR.

## Worktree root (same user directive, completes ADR 0004)

The contribution workspace root is **user-provided**: the user designates a dedicated folder (like their ssoc root) at workstation setup (WEEK-06 config field). GitSwipe never defaults to writing into any existing personal folder — the user explicitly registers the root during pairing/setup.

## Consequences

- USER-THING-TO-DO #1 (product name) resolved; #7 reworded to "designate the workspace root folder when WEEK-06 lands".
- WEEK-08 branding pass targets "GitSwipe" identity.
