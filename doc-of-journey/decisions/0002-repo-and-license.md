# ADR 0002 — Repo + license state

Date: 2026-09-24
Status: LOCKED (until the user changes it)

## Decision

- Remote: `https://github.com/arcgod-design/gitswipe.git`, branch `main`, user-provided.
- **No LICENSE file for now** (user directive). The repo must be treated as private until a license is locked. Consequences:
  - No public release, no "open source" claims in README until the license exists (contract §47 blocks public release otherwise).
  - License choice (MIT vs Apache-2.0) is USER-THING-TO-DO; WEEK-11/12 hard-depend on it.

## Notes

- Repo name (`gitswipe`) vs product name (contract says "Jarvis") — open question; branding pass is WEEK-08+. Do not rename anything until the user locks the product name.
