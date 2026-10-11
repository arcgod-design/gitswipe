# WEEK-14 - Orchestration + harness v1.1 (the user's locked direction)

> Exit test: model routing is visible and configurable per task type (analysis/coding/review) with fallback chains; the session queue is honest sequential; the harness mounts optional agent tools behind the s118 policy; the adapter catalog is real.

## Scope (locked 2026-10-09, user directive: multi-agent, LLM orchestration, proper harness)

- **Model-type routing UI (s7.2)**: Settings gains the routing table - discovery-rank / repo-analysis / prompt-generation / security-review routes, each with its model + fallback chain (the ModelRouter + failover already exist and are tested; this is the surfaced configuration). 'Orchestration model type' = these routes, visible.
- **Semantic handlers**: per-event-type handlers in the gateway (s20) - ApprovalRequested -> approval queue; AgentFailed -> recovery classification (s32 categories exist); FileChanged -> diff tracking. The event-to-behavior map becomes explicit, testable code rather than scattered conditionals.
- **Sequential session queue**: the singleton adapter stays (the user's lock: parallel depends on harness API budgets); a second dispatch while one runs QUEUES honestly (state QUEUED -> auto-start when the active session reaches a terminal state). The DurableQueue from WEEK-05 is the backing store.
- **Harness tool doors (the api-anything pattern)**: optional MCP tools for dispatched agents (web-doc access with self-heal), mounted per settings + gated by the s118 network-class policy. Includes the worktree tool manifest (CLI-Anything pattern, already parked in SUGGESTIONS).
- **Agent adapter catalog**: the orca 30+ list (gitresearch.md) becomes the adapter backlog surface (Settings > Agents shows opencode live + the catalog as future adapters, s17).
- **PR lifecycle tail (ADR 0004)**: fork detection (origin fork exists? real push targets it), `gh` PR creation behind the approval gate, the per-repo ledger wired to session completion.

## Notes

- Per-session adapters (true parallel multi-agent) stay deferred until harness budgets justify it - the queue is the honest v1.1 answer (user's reasoning: API rate limits make parallel unaffordable/unreliable).