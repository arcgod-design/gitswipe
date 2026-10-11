# SESSION-STATE.md — as of 2026-10-09 deep night (session 28: the file-transport switch, first attempt failed)

## The milestone standing

https://github.com/expressjs/express/pull/7520 - the real PR landed (gh CLI is a harness citizen: check + fork + default-branch + automated PR creation). The full loop is proven end to end on a real major OSS repo.

## THE OPEN BLOCKER (WEEK-10 core, in flight)

The pipe-buffering fix (dispatched opencode runs stream to files, never to the daemon's pipes). The adapter was switched to cmd-redirect + file-tail. FIRST ATTEMPT FAILED: the cmd line itself is broken (exit 1 instantly, zero output, both models) - the quoting of the long --title/redirect needs the manual-echo debug pass (errors.md has the sequence). The tail-watcher architecture is sound + tested; only the shell line is broken.

## The stack (all committed)

- Journal-backed session history (survives restarts) + honest FAILED states (red badge + reason)
- The responsive shells (s36 sidebar / s35 tabs + wordmark)
- gh harness integration (fork, default-branch, PR creation + fallbacks)
- The adapter: watchdog + rotation + tree-kill + the PR creator + (new) the file-tail transport
- 191/191 tests, typecheck clean; commits through 8285c1c + the transport switch

## The weeks ladder (the remaining work, in order)

- WEEK-10 core: fix the cmd quoting -> LIVE re-dispatch proof (the file transport) -> then reconnect/replay E2E, no-hidden-retry audit, security fixtures, Lighthouse
- WEEK-09 remainder: mobile notifications (approval/completion), offline replay, release config
- WEEK-11: packaging + CI (semgrep gate, installers, PROVIDER_GUIDE)
- WEEK-12: master acceptance (s215) + v1 ship
- WEEK-13: Work/Projects/References/Activity + session tabs + s9.2 rows
- WEEK-14: orchestration v1.1 (routing UI, semantic handlers, the queue, MCP doors, adapter catalog) - the PR tail is DONE

## User items

Minimal PAT swap + rotate both keys. Hands-on walkthrough + backup recording. imagemode.md visual passes.