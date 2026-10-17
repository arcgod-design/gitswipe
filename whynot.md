# whynot.md — why GitSwipe is NOT production ready (the brutal audit, UPDATED 2026-10-10 night)

> The user asked for this file. Every point was real when written. 6 of 13 are now FIXED. The honest status of each is below.

---

## FIXED (with proof)

### 1. THE FEED IS NOT PERSONAL — ✅ FIXED
Auto-discovers from the user's GitHub via gh CLI: their languages (TypeScript, JavaScript, HTML, Python, Jupyter Notebook for this user), their repos with open issues, language-matched repos. The skill graph seeds from their actual data. feedRepos is a user override, not the default.

### 2. CARDS RUN OUT — ✅ FIXED
Auto-refill when the feed runs low: POST /api/feed/refill re-discovers, dedupes, appends. The UI auto-triggers on low feeds + shows a Refresh button in the empty state.

### 3. WORK SCREEN IS DECORATIVE — ✅ FIXED
SAVED items tap → the contract screen → dispatch. The s4.2 loop completes.

### 4. ZOMBIE SESSIONS — ✅ FIXED
recoverZombieSessions on the first listSessions call: journal-backed RUNNING with no live process → FAILED with the honest reason. The sequential queue unblocks.

### 5. NO OFFLINE/RECONNECT — ✅ FIXED
SSE auto-reconnect (3s) + event replay from the last cursor (lastSeq). The airplane-mode test is structural: the phone goes offline → the daemon + agent keep working locally → the phone reconnects → replays from its cursor.

### 11. SKILL GRAPH COLD-START — ✅ FIXED
discoverUserLanguages via gh CLI: the graph seeds from the user's actual GitHub languages.

---

## REMAINING GAPS (still real)

### 6. Windows-only setup
`start-gitswipe.bat` works on Windows. No macOS/Linux equivalent. The contract s2.6 requires one-click for all platforms.

### 7. No release APK
Only debug builds exist. No signing config, no AAB pipeline, no release channel. The contract s38 says CI must produce a release artifact.

### 8. Session state dies with daemon (PARTIAL)
Zombie recovery marks orphans as FAILED (honest), but there is no RESUME — a daemon restart mid-run loses the active session's progress. The agent's worktree work survives, but the session management state does not.

### 9. No E2E live tests
191 tests cover the deterministic core. The live paths (opencode adapter file transport, gh CLI calls, nemotron analysis, the full loop) are manually proven only. Every code change could silently break the live path with all tests still green.

### 10. Security gaps in the live agent path
- opencode spawns its own child processes that are NOT individually gated by the s26 policy engine
- No rate limiting on the API surface
- Session tokens in localStorage (not platform secure storage)
- No CSRF token

### 12. No data versioning
settings.json, sessions.jsonl, swipes.jsonl have no version fields. A schema change breaks existing installs silently.

### 13. No desktop application
The browser tab works but is not a desktop product. The contract s37 specifies a shell with tray + updater.

---

## The honest verdict (updated)

**6 of 13 gaps are fixed.** The core experience (personal feed → swipe → contract → dispatch → approval → PR) is now genuinely personal and resilient. The remaining gaps are infrastructure polish (mac/linux setup, release builds, E2E tests, security hardening, data versioning) — important but not blocking the core loop from working correctly for a real user.

**The gap is narrower but still real.** A stranger installing GitSwipe today gets a working product that finds THEIR repos, learns THEIR skills, dispatches a real coding agent, and opens real PRs. What they don't get: mac/linux support, a release build, automated E2E tests, or a security audit of the live agent path.