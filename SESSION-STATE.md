# SESSION-STATE.md — as of 2026-09-24 (WEEK-06 deterministic core done on dev)

## Current week

**WEEK-06** — ✅ deterministic core DONE; live OpenCode path remains PROTO (blocked: no opencode CLI on this machine + no BYOK key yet, U5). What is verified: @jarvis/agents — AgentAdapter contract + session-title convention; MockAgentAdapter with a state-machine-legal timeline; AgentGateway (session machine, approval binding with real action-hash verification, decide-from-either-state guards, follow-up, pause/resume, stop); WorktreeManager (real git worktrees, REPO-WORK-CONVENTIONS branch naming, isolation, cleanup, ledger); CheckpointStore (s33 phase trail incl. TESTING/REVIEW_READY); OpenCodeAdapter (honest unavailability detection, server health probe, opencode-run dispatch convention from the user's research, PROTO discipline on runtime paths).

## Stack state

- Branch: dev. 142/142 tests, typecheck clean, audit 0.
- 8 packages + agents: protocol, policy, providers, github, discovery, agents, daemon (+ web on mvp).
- ADRs 0001-0008 on dev (0008 extracted from mvp + addendum with the user's OpenCode session research: unified DB takeover, session resume path, --title convention).
- Releases on main: v0.1.0, v0.2.0, v0.2.1.

## Verified this session (exact commands, real outputs)

- npm run typecheck -> clean
- npm test -> 142/142 (13 agents tests incl. full lifecycle E2E on a real scratch git repo with isolated worktree, approval binding, deny->PAUSED, pause/resume around the gate, follow-up, checkpoint trail, worktree isolation/cleanup/duplicates, OpenCode detection/health/dispatch-args/PROTO)

## Known pain points

- The RUNNING->COMPLETED skip escaped twice (mvp demo + fresh agents port) before the state machine caught it - agent timelines must be tested against the full transition table on every port (errors.md).
- decide() can legally arrive from WAITING_FOR_APPROVAL or resumed RUNNING - transition guards added.
- ADR/state files written on mvp don't exist on dev until merged - ADR 0008 had to be extracted manually. Watch for other mvp-only docs at the next dev<-mvp merge.

## Next concrete steps

1. WEEK-06 live tail (needs a machine with opencode + BYOK key): wire OpenCodeAdapter runtime paths (run --dir/--title/--model), session resume follow-ups, PR-lifecycle watch loop (gh CLI: CI state, mergeable, CodeRabbit resolution queue, maintainer-blocked ledger). Until then WEEK-06 stays PARTIAL — no v0.3.0 merge.
2. Or proceed to WEEK-07 (security integration: policy on the exec path, credential broker, approval queue replay protection, audit journal, redaction) — fully testable without OpenCode.

## Docs health

Current; ADR 0008 + addendum on dev; errors.md carries the twice-escaped lesson.