# USER-THING-TO-DO.md — things only the user can do

> If a task is waiting on you, it will be listed here. Agents: check this before stalling; add items when a user decision genuinely blocks progress. Never put secrets in chat — put them in `.env` (gitignored).

| # | Item | Needed by | Status |
|---|------|-----------|--------|
| 1 | ~~Confirm the product name~~ — **RESOLVED 2026-09-24: GitSwipe** (public) / Jarvis internal codename (ADR 0005) | — | ✅ DONE |
| 2 | **Pick a license** (MIT vs Apache-2.0). No public release before this. | WEEK-11/12 | OPEN |
| 3 | ~~GitHub App / OAuth app credentials~~ — **superseded by ADR 0006** (fine-grained PAT is v1 auth; no OAuth needed) | — | ✅ RESOLVED |
| 4 | **Puter app registration** (app UID + origin) — optional path only, nothing in the core flow requires it. | WEEK-08 | OPEN |
| 5 | **BYOK test key** (OpenAI or any provider) placed in local `.env` — never pasted into a chat. This is the single blocker for: WEEK-01 live provider smoke, WEEK-06 live OpenCode session (the remaining exit-test item), and any live AI-opportunity analysis. | WEEK-06 live tail | OPEN |
| 5b | **GitHub fine-grained PAT** via `jarvisd secret set github:token` — enables live GitHub smoke (rank real repos, check real issue states). Fixtures + all tests pass without it. | whenever convenient | OPEN |
| 6 | Confirm Android SDK path in Android Studio is configured (for WEEK-09 Capacitor builds). | WEEK-09 | OPEN |
| 7 | **Designate the contribution workspace root folder** (a dedicated folder like your ssoc root — GitSwipe registers it at workstation setup and manages worktrees under it; it will not write into ssoc itself). | WEEK-06 setup | OPEN |
| 8 | **Review the parked SUGGESTIONS.md items** (semgrep diff-scan gate, worktree tool manifest, CLI-Anything wishlist source, patchwork/OpenHands adapters, binary-analysis radar) — promote or kill each so they don't rot as zombie ideas. | post-v1 planning | OPEN |
