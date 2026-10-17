# SESSION-STATE.md — as of 2026-10-10 night (session 35: whynot #1-5 + #11 all fixed)

## The production-ready progress

| whynot gap | Status | What shipped |
|---|---|---|
| #1 Feed not personal | ✅ FIXED | Auto-discovers from the user's GitHub: their languages, their repos, language-matched repos. The skill graph seeds from their actual data. Verified: TypeScript/JS/HTML/Python/Jupyter → 5 repos → 12 candidates. |
| #2 Cards run out | ✅ FIXED | Auto-refill when the feed runs low (re-discover + dedupe + append) + UI auto-trigger + Refresh button |
| #3 Work SAVED dead | ✅ FIXED | Tap SAVED → contract screen → dispatch |
| #4 Zombie sessions | ✅ FIXED | recoverZombieSessions on the first listSessions: journal-backed RUNNING with no live process → FAILED (honest reason). Verified: 1 recovered, queue unblocked. |
| #5 No offline/reconnect | ✅ FIXED | SSE auto-reconnect (3s) + event replay from the last cursor (lastSeq). The airplane-mode test is now structural: hotspot dies → agent keeps working locally → phone reconnects → replays from its cursor. |
| #11 Skill graph cold-start | ✅ FIXED | discoverUserLanguages via gh CLI → the graph seeds from the user's actual languages |
| #8 Session state dies with daemon | ⚠️ PARTIAL | Zombie recovery (honest FAIL), not resume |
| #6 macOS/Linux setup | 🔴 OPEN | start-gitswipe.sh |
| #7 Release APK | 🔴 OPEN | assembleRelease for CI |
| #9 E2E live tests | 🔴 OPEN | |
| #10 Security in live agent path | 🔴 OPEN | |
| #12 Data versioning | 🔴 OPEN | |
| #13 Desktop shell | 🔴 OPEN | browser works |

## The stack

190/191 tests + 1 skipped (live provider, shared budget honesty). Typecheck clean. The full loop proven (express PR #7520). The feed is personal. Cards refill. Sessions recover. The phone reconnects.

## Remaining for full production readiness

1. start-gitswipe.sh (mac/linux) — small
2. assembleRelease gradle config — small
3. E2E live test (the full loop automated) — medium
4. Security: rate limiting on the API + opencode children gated — medium
5. Data version fields on settings/sessions/swipes — small