# USER-THING-TO-DO.md — things only the user can do

> If a task is waiting on you, it will be listed here. Agents: check this before stalling; add items when a user decision genuinely blocks progress. Never put secrets in chat — put them in `.env` (gitignored).

| # | Item | Needed by | Status |
|---|------|-----------|--------|
| 1 | **Confirm the product name**: contract says "Jarvis", the repo is named "gitsweep". Which name ships? | WEEK-08 branding | OPEN |
| 2 | **Pick a license** (MIT vs Apache-2.0). No public release before this. | WEEK-11/12 | OPEN |
| 3 | **GitHub App / OAuth app credentials** for the user-owned GitHub connection (WEEK-02 start decides which type). Create at github.com/settings/developers when ready. | WEEK-02 live smoke | OPEN |
| 4 | **Puter app registration** (app UID + origin) — optional path only. | WEEK-08 | OPEN |
| 5 | **BYOK test keys** (OpenAI or any provider) placed in local `.env` — never pasted into a chat. | WEEK-01 live smoke | OPEN |
| 6 | Confirm Android SDK path in Android Studio is configured (for WEEK-09 Capacitor builds). | WEEK-09 | OPEN |
| 7 | When the first real OpenCode-dispatched task runs (WEEK-06): confirm the default workspace root for contribution worktrees (today your ssoc root is `C:\Users\arc\OneDrive\Desktop\ssoc\ssoc\` — should Jarvis default to that, or a new Jarvis-owned root?) | WEEK-06 | OPEN |
