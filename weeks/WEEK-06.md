# WEEK-06 — AgentGateway: OpenCode adapter, mock agent, sessions, worktrees, PR lifecycle

> Exit test: a mock-agent session runs the full lifecycle E2E (start → events → files changed → tests → approval request → complete) against a scratch repo; a real OpenCode session does the same live; every session maps through JarvisSession with its own worktree; PR lifecycle follow-ups queue correctly (fix-on-branch, rebase-on-conflict, bot-review resolution, maintainer-blocked).

## Scope

- `packages/agents`: AgentGateway implementation + AgentAdapter interface (contract §17).
- OpenCodeAdapter with preference order: headless server HTTP/SSE → ACP (newline-delimited JSON-RPC) → CLI JSON fallback; capability detection per installed version, fail gracefully on incompatible versions (§18, §153). Verify current OpenCode APIs against live docs during this week — do not hard-code assumptions.
- MockAgentAdapter: deterministic fake for tests/E2E — start/message/file-change/test/approval-request/complete/failure/resume (§202). The CI suite never requires a live OpenCode.
- Session manager: JarvisSession identity model (§18.2), state machine enforcement (§19) wired to the protocol transition table, event normalization into the journal, follow-up into the SAME session (§44), pause/stop semantics (§137/§138), takeover mode (§29, §139 — policy engine stays armed during takeover).
- Worktree manager full: per-task isolated worktrees per REPO-WORK-CONVENTIONS (one issue = one worktree under `<Repo>/issue-N/`), branch naming (`feat/issue-N-slug` / `feat/jarvis-<id>-slug`), fork/upstream remotes, cleanup-with-preserved-artifacts policy (§30, §137).
- Git workflow enforcement: commit identity config, `(closes #N)` keywords, PR creation via `gh pr create --body-file`, pre-push gates (repo lint + tests) before any push (REPO-WORK-CONVENTIONS §2–§5).
- PR lifecycle loop: workstation watches PR state (CI results, mergeable status, CodeRabbit/bot review comments) and queues the §6 handling table as follow-up work; maintainer-blocked → ledger + user notification, never silent retry.
- Checkpoints: task-level checkpoint records so a restart resumes from a safe point (§33, §152).

## Notes

- HarnessAdapter is interface-only this week (mock tests), real work post-v1.
- Agent events never store private chain-of-thought: AgentThinkingSummary = concise user-safe progress text (§20, §100).
