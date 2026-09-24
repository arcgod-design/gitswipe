# docs/MVP-PLAN.md — the mvp branch pitch demo

> Locked by user decision 2026-09-24 (PROJECT-CORE #23): full demo loop, built in parallel with the dev ladder.
> Branch: `mvp`. Demo mode rules: contract §201 — obvious, isolated from real credentials, never accidentally operating on real repos.

## The pitch story (what someone sees)

1. Open `http://127.0.0.1:7420` — clean UI, obvious "DEMO DATA" badge.
2. Swipe feed: real discovery-engine cards (fixture issues/repos through `@jarvis/discovery`), left/right works, "why this?" shows the explainable reasons.
3. Swipe right → task contract rendered (the real `@jarvis/protocol` TaskContract + markdown) — edit before starting.
4. Start work → mock agent session (`MockAgentAdapter`, contract §202): live event stream (thinking summary, file changes, tests), terminal, diff — all structured events through the real journal.
5. A policy-gated action arrives → approval card with exact action + diff context → approve → session completes, PR-draft summary.
6. Reset demo button — wipes demo state only.

## Architecture (what gets pulled forward from the ladder)

| Piece | Source | MVP shape |
|---|---|---|
| Daemon HTTP server | WEEK-05 E3/E5 | loopback-only, no auth beyond loopback token, minimal config |
| Event journal + SSE | WEEK-05 E4 | JSONL journal + `/api/events` SSE with replay-from-cursor |
| Feed/swipe/contract API | WEEK-05/06 | thin handlers over `@jarvis/discovery` + `@jarvis/protocol` — no new engines |
| Mock agent | WEEK-06 | deterministic script: inspect → 2 file changes → tests pass → approval request → complete |
| Web UI | WEEK-08 (pulled forward) | React+Vite on the daemon; **mandatory taste-skill + ui-ux-pro-max pass before any UI code** |
| Demo data | — | fixture repos/issues (labeled), never real credentials; `.env` ignored in demo mode |

## Non-goals (stay honest in the pitch)

- No real OpenCode dispatch (mock agent only — say so in the demo).
- No real GitHub writes. No push. Worktree simulation only.
- No multi-device/pairing (loopback only).
- Everything demo'd maps 1:1 to a dev-ladder week — nothing fake pretending to be production.

## Merge rule (ADR 0007)

MVP code merges into dev when a piece reaches production grade (daemon server → dev in WEEK-05; mock agent → dev in WEEK-06; UI screens → dev in WEEK-08). The mvp branch stays demoable at all times.
