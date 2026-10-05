# USER-THING-TO-DO.md — things only the user can do

> If a task is waiting on you, it will be listed here. Agents: check this before stalling; add items when a user decision genuinely blocks progress. Never put secrets in chat — put them in `.env` (gitignored).

| # | Item | Needed by | Status |
|---|------|-----------|--------|
| 1 | ~~Confirm the product name~~ — **RESOLVED 2026-09-24: GitSwipe** (public) / Jarvis internal codename (ADR 0005) | — | ✅ DONE |
| 2 | **Pick a license** (MIT vs Apache-2.0). No public release before this. | WEEK-11/12 | OPEN |
| 3 | ~~GitHub App / OAuth app credentials~~ — **superseded by ADR 0006** (fine-grained PAT is v1 auth; no OAuth needed) | — | ✅ RESOLVED |
| 4 | **Puter app registration** (app UID + origin) — optional path only, nothing in the core flow requires it. User decision: "Puter will be seen later" — parked until after the demo. | post-demo | PARKED |
| 5 | ~~BYOK test key~~ — **RESOLVED 2026-10-04: NVIDIA NIM key stored in the OS secret store** (`provider:nvidia-nim`, DPAPI-backed; never in a committed file) and verified live: health OK, `nvidia/nemotron-3-super-120b-a12b` chat ping replied. **Rotate the key after the demo — it was pasted into a chat once.** | — | ✅ DONE (rotate pending) |
| 5b | **GitHub fine-grained PAT** via `jarvisd secret set github:token` — enables live GitHub smoke (rank real repos, check real issue states). User: "will provide later." Fixtures + all tests pass without it; the demo runs on the seeded feed. | before demo if possible | OPEN |
| 6 | ~~Android SDK path~~ — Android Studio is installed (user confirmed 2026-10-04). SDK path gets verified during the D2 Capacitor setup; the installed skills (`capacitor-best-practices`, `argent-android-emulator-setup`) drive it. | D2 | IN PROGRESS |
| 7 | ~~Designate the contribution workspace root folder~~ — **RESOLVED 2026-10-04 (design)**: user gives a folder in the app Settings (an existing GitHub work folder like ssoc is fine) or GitSwipe auto-creates a default inside its data dir. Every approved action is confined to it. The UI + API shipped (D1); still happy to take your ssoc path whenever you want it set before the demo. | — | ✅ RESOLVED (design + shipped; folder path optional) |
| 8 | **Review the parked SUGGESTIONS.md items** (semgrep diff-scan gate, worktree tool manifest, CLI-Anything wishlist source, patchwork/OpenHands adapters, binary-analysis radar) — promote or kill each so they don't rot as zombie ideas. | post-v1 planning | OPEN |
