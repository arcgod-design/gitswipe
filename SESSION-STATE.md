# SESSION-STATE.md — as of 2026-10-18 final (whynot 10/13 fixed, #8 upgraded to partial+recovery)

## The state

The full production loop is live and personal: feed (your languages, your repos, auto-refill) -> swipe (self-learning) -> contract (nemotron) -> dispatch (opencode in an isolated worktree) -> streamed events -> approval (phone buzzes) -> fork + push + gh pr create. The phone is paired through the Cloudflare tunnel from any network. The connection-failed state shows "Could not reach the workstation" with a Re-pair action.

## The whynot gap ledger (10 of 13 fixed, 2 partial)

| # | Gap | Status |
|---|---|---|
| 1 | Feed not personal | ✅ |
| 2 | Cards run out | ✅ auto-refill |
| 3 | Work SAVED dead | ✅ tap -> contract -> dispatch |
| 4 | Zombie sessions | ✅ recovery + uncommitted-work detection |
| 5 | No offline/reconnect | ✅ SSE reconnect + replay |
| 6 | Windows-only setup | ✅ start-gitswipe.sh |
| 7 | No release APK | ✅ 1.7 MB minified |
| 8 | Session resume | ⚠️ honest FAIL + uncommitted-work detection (code preserved; not auto-resume) |
| 9 | No E2E tests | ✅ 10-step standalone |
| 10 | Security gaps | ✅ rate limiting (120/min, 429 verified) + token storage; opencode children remain ungated |
| 11 | Skill graph cold-start | ✅ |
| 12 | No data versioning | ✅ |
| 13 | Desktop shell | 🔴 post-v1 |

## What the session recovery does now

On serve restart, a RUNNING zombie session gets marked FAILED. The recovery then runs `git status` in the worktree: if the agent left uncommitted code (not TASK_CONTRACT.md), the failure reason becomes "BUT N file(s) with uncommitted agent work found in <path> — the code is preserved; review and commit manually or re-dispatch." The journal payload carries `uncommitted: true`. The user knows the agent's work didn't vanish.

## Stack

190/191 + 11 skipped tests. Typecheck clean. APK installed. All committed (257d1fa).