# USER-THING-TO-DO.md — things only the user can do

> If a task is waiting on you, it will be listed here. Agents: check this before stalling; add items when a user decision genuinely blocks progress. Never put secrets in chat — put them in `.env` (gitignored).

| # | Item | Needed by | Status |
|---|------|-----------|--------|
| 1 | ~~Confirm the product name~~ — **RESOLVED 2026-09-24: GitSwipe** (public) / Jarvis internal codename (ADR 0005) | — | ✅ DONE |
| 2 | **Pick a license** (MIT vs Apache-2.0). No public release before this. | WEEK-11/12 | OPEN |
| 3 | **GitHub App / OAuth app credentials** for the user-owned GitHub connection (WEEK-02 start decides which type). Create at github.com/settings/developers when ready. | WEEK-02 live smoke | OPEN |
| 4 | **Puter app registration** (app UID + origin) — optional path only. | WEEK-08 | OPEN |
| 5 | **BYOK test keys** (OpenAI or any provider) placed in local `.env` — never pasted into a chat. | WEEK-01 live smoke | OPEN |
| 6 | Confirm Android SDK path in Android Studio is configured (for WEEK-09 Capacitor builds). | WEEK-09 | OPEN |
| 7 | **Designate the contribution workspace root folder** (a dedicated folder like your ssoc root — GitSwipe registers it at workstation setup and manages worktrees under it; it will not write into ssoc itself). | WEEK-06 setup | OPEN |
