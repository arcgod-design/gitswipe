# SESSION-STATE.md — as of 2026-10-18 (the phone paired through the tunnel; the loop is personal)

## The current state

The phone is PAIRED and showing the personal feed (TanStack/query #11586, TypeScript, 0.80, "matches your strongest languages"). The connection goes through a Cloudflare tunnel (https://brunette-conducted-principle-bailey.trycloudflare.com) — works from any network. The tunnel URL changes on each restart (start-gitswipe regenerates it).

## The full production loop (all live)

feed (your repos, your languages, auto-refill) -> swipe (streams, self-learning) -> contract (nemotron analysis) -> dispatch (opencode in an isolated worktree) -> streamed events (file transport + heartbeats) -> approval (phone buzzes, green/red badge) -> fork + push + gh pr create. Proven end to end: expressjs/express PR #7520.

## The whynot gap ledger (10 of 13 fixed)

| # | Gap | Status |
|---|---|---|
| 1 | Feed not personal | ✅ discoverUserLanguages + discoverUserRepos + discoverFromLanguages |
| 2 | Cards run out | ✅ auto-refill + Refresh button |
| 3 | Work SAVED dead | ✅ tap -> contract -> dispatch |
| 4 | Zombie sessions | ✅ recoverZombieSessions |
| 5 | No offline/reconnect | ✅ SSE auto-reconnect + event replay from lastSeq |
| 6 | Windows-only setup | ✅ start-gitswipe.sh (macOS/Linux) |
| 7 | No release APK | ✅ 1.7 MB minified + proguard, unsigned |
| 8 | Session resume | ⚠️ honest FAIL (not resume) |
| 9 | No E2E tests | ✅ 10-step e2e-loop.test.ts (standalone: VITEST_E2E=1) |
| 10 | Security gaps | ✅ rate limiting (120/min, 429 verified) + token storage hardened |
| 11 | Skill graph cold-start | ✅ seeds from user's real languages |
| 12 | No data versioning | ✅ SETTINGS_VERSION=1 + sessions.jsonl version:1 |
| 13 | Desktop shell | 🔴 post-v1 (browser works) |

## The stack

- 190/191 tests + 11 skipped (1 live + 10 E2E standalone), typecheck clean
- 9 packages + web + mobile (Capacitor 7)
- All 9 sections live, 0 soon tags
- Model routing (s7.2), adapter catalog (s17), sequential queue
- gh CLI integration (fork, PR, default branch)
- semgrep security CI, PROVIDER_GUIDE, one-click installers (3 platforms)
- Connection-failed state with Re-pair action (the network-change UX)

## Open

- #8 session resume (CheckpointStore exists; resume logic missing)
- #10 remaining: opencode children gated (the policy engine doesn't individually gate opencode's subprocess)
- #13 desktop shell (Tauri, post-v1)