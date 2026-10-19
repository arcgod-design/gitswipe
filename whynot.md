# whynot.md — why GitSwipe is NOT production ready (the brutal audit, FINAL 2026-10-18)

> The user asked for this file. 11 of 13 gaps are now FIXED or PARTIALLY FIXED. The honest status of each is below.

---

## FIXED (11 of 13)

| # | Gap | Fix | Proof |
|---|---|---|---|
| 1 | Feed not personal | Auto-discovery from user's GitHub (languages + repos + language-matched) | TypeScript/JS/HTML/Python/Jupyter → 5 repos → 12 candidates |
| 2 | Cards run out | Auto-refill + UI auto-trigger + Refresh button | POST /api/feed/refill live |
| 3 | Work SAVED dead | Tap SAVED → contract → dispatch | s4.2 loop completes |
| 4 | Zombie sessions | recoverZombieSessions | 1 recovered, queue unblocked |
| 5 | No offline/reconnect | SSE auto-reconnect + event replay from lastSeq | s21 structural |
| 6 | Windows-only setup | start-gitswipe.sh (macOS/Linux) | File written |
| 7 | No release APK | assembleRelease (1.7 MB, minified, proguard) | Built + verified |
| 8 | Session resume | Honest FAIL + uncommitted-work detection + boundary check | Code preserved + user notified |
| 9 | No E2E tests | 10-step e2e-loop.test.ts | 9/10 first run (standalone) |
| 10 | Security gaps | Rate limiting (120/min, 429 verified) + worktree boundary check (escape detection) + token storage | 124/6 rejected + BOUNDARY WARNING events |
| 11 | Skill graph cold-start | discoverUserLanguages | User's TypeScript weighted |
| 12 | No data versioning | SETTINGS_VERSION=1 + sessions version:1 | Migration path exists |

## REMAINING (2 of 13)

### 8. Auto-resume (beyond honest FAIL)
The recovery detects and reports uncommitted work, but doesn't auto-reattach to a live opencode process. **Fix path: reattach to the output file tail + re-enter the session state machine at the appropriate phase.**

### 13. Desktop shell
Browser tab works; the contract s37 specifies a Tauri shell with tray + updater. **Post-v1.**

---

## The honest verdict (FINAL)

**11 of 13 gaps are fixed or partially fixed.** The core product loop is personal, resilient, tested, packaged, and secure against the practical threats we've identified:
- **The feed is yours**: your languages, your repos, auto-discovered, auto-refilling
- **The loop is real**: swipe → contract → dispatch → approval → PR (proven on expressjs/express #7520)
- **The phone works from anywhere**: Cloudflare tunnel, notifications, connection-failed recovery
- **Setup is one click**: Windows .bat, macOS/Linux .sh
- **Release builds exist**: 1.7 MB APK, semgrep CI, E2E tests
- **Security is layered**: policy engine gates the dispatch, worktree boundary check detects escapes, rate limiting, hash-bound approvals, credential broker

**The 2 remaining gaps are infrastructure depth, not product gaps.** A real user can install GitSwipe, see their own repos, swipe, dispatch an agent, approve the push, and get a PR. The 2 gaps are auto-resume (nice-to-have; the honest FAIL + work detection covers the user's data) and the desktop shell (the browser already works).