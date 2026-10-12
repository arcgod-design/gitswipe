# SESSION-STATE.md — as of 2026-10-10 dawn (session 29: THE dispatched agent streams — the project's biggest blocker is dead)

## The state

A live dispatched run streams real agent events (23 in the first 50s: 'Let me explore the key files...' -> tool calls -> 'step finished, 55849 tokens') and writes real code in the worktree. The full loop is now REAL end to end and UNATTENDED: feed -> swipe -> contract (nemotron) -> dispatch (opencode + lightning) -> streamed events -> approval gate -> fork + push + gh pr create (the express PR #7520 proved the tail).

## The unlock (three stacked fixes)

1. File transport: opencode streams to files, block-buffers pipes -> redirect + tail (drainFile)
2. spawn(line, { shell: true, stdio: ignore }): the cmd.exe /c array form broke quoting (instant exit 1); the detached daemon has no stdin
3. Chain: lightning-30b FIRST (glm-5.3 + gpt-oss-20b silent on opencode+nvidia - the deepseek disease); NVIDIA-only per the user's lock (shared key budget)

## Stack (all committed, d0241c9)

191/191 tests, typecheck clean. Journal-backed session history. Honest FAILED states. The responsive shells (s36/s35). gh harness integration. The PR automation. The one-click .bat.

## The remaining weeks ladder (next: complete them in order)

- WEEK-09: mobile notifications (LocalNotifications plugin: approval-needed / completed / failed), offline event replay, release build config
- WEEK-10 remainder: reconnect/replay E2E, no-hidden-retry audit, security fixtures, Lighthouse (the transport core is DONE)
- WEEK-11: packaging + CI (semgrep gate, installers, PROVIDER_GUIDE + litellm one-liner)
- WEEK-12: master acceptance (s215) + v1 ship
- WEEK-13: Work/Projects/References/Activity + session tabs (Diff/Tests) + s9.2 rows
- WEEK-14: orchestration v1.1 (routing UI, semantic handlers, the sequential queue, MCP doors, adapter catalog)

## User items

Minimal PAT swap + rotate both keys. Hands-on walkthrough + backup recording. imagemode.md passes.