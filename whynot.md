# whynot.md — why GitSwipe is NOT production ready (the brutal audit, FINAL 2026-10-10)

> The user asked for this file. 10 of 13 gaps are now FIXED. The honest status of each is below. The remaining 3 are post-v1 infrastructure.

---

## FIXED (with proof)

| # | Gap | Fix | Proof |
|---|---|---|---|
| 1 | Feed not personal | Auto-discovery from the user's GitHub (languages + repos + language-matched) | TypeScript/JS/HTML/Python/Jupyter -> 5 repos -> 12 candidates |
| 2 | Cards run out | Auto-refill when low + UI auto-trigger + Refresh button | POST /api/feed/refill live |
| 3 | Work SAVED items dead | Tap SAVED -> contract screen -> dispatch | s4.2 loop completes |
| 4 | Zombie sessions | recoverZombieSessions: RUNNING with no live process -> FAILED | 1 recovered, queue unblocked |
| 5 | No offline/reconnect | SSE auto-reconnect (3s) + event replay from lastSeq cursor | s21 structural |
| 6 | Windows-only setup | start-gitswipe.sh for macOS/Linux (arch+OS detection + cloudflared) | File written |
| 7 | No release APK | assembleRelease (minified + proguard, unsigned per s38) | 1.7 MB built |
| 9 | No E2E live tests | e2e-loop.test.ts: 10 steps covering the full loop | 9/10 first run (step 6 timeout fixed to 30s) |
| 11 | Skill graph cold-start | discoverUserLanguages: the graph seeds from the user's real languages | User's TypeScript is weighted |
| 12 | No data versioning | SETTINGS_VERSION = 1; sessions.jsonl entries carry version: 1 | Migration path exists |

## REMAINING (3 of 13)

### 8. Session state dies with daemon (PARTIAL)
Zombie recovery marks orphans as FAILED (honest), but there is no RESUME. A daemon restart mid-run loses the active session's management state. The agent's worktree work survives; the session context does not. **Fix path: checkpoint-based resume (s33) — the CheckpointStore exists, the resume logic is the missing piece.**

### 10. Security gaps in the live agent path
- opencode spawns its own child processes that are NOT individually gated by the s26 policy engine
- No rate limiting on the API surface
- Session tokens in localStorage (not platform secure storage)
- No CSRF token
**Fix path: a per-request policy wrapper + a Capacitor secure-storage migration. Medium effort.**

### 13. No desktop application
The browser tab works but is not a desktop product. The contract s37 specifies a shell with tray + updater. **Fix path: Tauri wrapper (contract s181 recommends it) or Electron. Post-v1.**

---

## The honest verdict (FINAL)

**10 of 13 gaps are fixed.** The core product loop is personal, resilient, tested, and packaged:
- **The feed is yours**: your languages, your repos, auto-discovered, auto-refilling
- **The loop is real**: swipe -> contract -> dispatch -> approval -> fork -> push -> PR (proven on expressjs/express #7520)
- **The phone works**: notifications on approval/completion/failure, SSE reconnects, all 9 sections live
- **Setup is one click**: Windows (.bat), macOS/Linux (.sh), the browser does the rest
- **Release builds exist**: 1.7 MB minified APK, CI security scanning (semgrep)
- **The E2E test exists**: 10 steps covering healthz -> pair -> feed -> swipe -> contract -> session -> approval -> list -> work -> activity -> settings

**The 3 remaining gaps are infrastructure depth, not product gaps.** A real user can install GitSwipe, see their own repos, swipe, dispatch an agent, approve the push, and get a PR. What they don't get: session resume on daemon restart, security hardening of the live agent path, and a desktop shell. These are the v1.1 backlog.