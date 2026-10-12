# SESSION-STATE.md — as of 2026-10-10 evening (session 34: the personal feed + refill + recovery)

## What's fixed from whynot.md this session

| Gap | Status | What shipped |
|---|---|---|
| #1 The feed is not personal | ✅ FIXED | Auto-discovery from the user's GitHub: their languages, their repos, language-matched repos. Verified: TypeScript/JS/HTML/Python/Jupyter -> 5 repos -> 12 candidates. The skill graph seeds from the user's actual languages. |
| #2 Cards run out | ✅ FIXED | Auto-refill when the feed runs low: re-discover, filter duplicates, append. UI auto-triggers + a Refresh button in the empty state. |
| #3 Work screen SAVED items dead | ✅ FIXED (previous session) | Tap SAVED -> contract screen -> dispatch |
| #4 Zombie sessions | ✅ FIXED | recoverZombieSessions on first listSessions: journal-backed RUNNING sessions with no live process -> FAILED with the honest reason. Verified: 1 zombie recovered, queue unblocked. |
| #11 Skill graph cold-start-fixed | ✅ FIXED | The graph seeds from discoverUserLanguages (the user's actual GitHub language distribution), not hardcoded TypeScript/Python. |

## What remains from whynot.md

| Gap | Priority | Status |
|---|---|---|
| #5 Offline/reconnect | HIGH | The s21 test needs: SSE auto-reconnect + event replay from cursor + cached feed on the phone |
| #6 Windows-only setup | MEDIUM | start-gitswipe.sh for mac/linux |
| #7 No release APK | MEDIUM | assembleRelease config for CI |
| #8 Active session state dies with daemon | MEDIUM | Partially fixed by zombie recovery (honest FAIL), not resume |
| #9 No E2E live tests | MEDIUM | The full loop is manually proven but not automated |
| #10 Security gaps in live agent path | HIGH | opencode spawns its own children outside the gate; no rate limiting on the API |
| #12 No data versioning | LOW | settings.json + sessions.jsonl need version fields |
| #13 No desktop app | LOW | Browser tab works; the desktop shell is post-v1 |

## The product today

Feed (your languages, your repos, auto-refills) -> swipe (streams live) -> contract (nemotron analysis) -> dispatch (opencode in an isolated worktree) -> approval (your phone buzzes) -> fork + push + PR (gh CLI). All with your own keys, your own machine, your own GitHub. 190/191 tests.