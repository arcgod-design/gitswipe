# SUGGESTIONS.md — idea parking lot

> Promote an item to a week file ONLY with user approval (then update `docs/ROADMAP.md` + `NEXT-TASKS.md` + weeks ladder in the same commit). Nothing here is scheduled.

## From the contract (already scoped for post-v1 — do not re-litigate, just awaiting their weeks)

- HarnessAdapter (real implementation) — interface + mocks exist from WEEK-06. Contract §53.
- Tailscale/WireGuard transport provider — contract §24. Needs ADR when scheduled.
- Puter Workers shared discovery index (public repo metadata, cross-user) — contract §6/§157. Needs ADR: privacy boundaries + licensing of embeddings.
- Secure relay transport — contract §24, future/optional.
- Portfolio/learning mode queries ("help me learn Rust") — contract §97.
- "Build me a project" mode — contract §99.
- User-defined automation rules ("auto-approve tests on repo X") — contract §119.
- Data export (profile/skills/swipes/projects JSON) — contract §76.
- Reference → "how can this help my current project" comparison — contract §131.

## New ideas (add freely, promote only with user approval)

- **From gitresearch.md — CLI-Anything (2026-09-24, ⚠️ PARTIAL verdict):** (A) use HKUDS/CLI-Anything contributor wishlist issues as a *discovery source* — "build a CLI for X" tasks dispatched to OpenCode with their generator skill loaded; needs a task-contract template + a generator-agent policy profile. (B) Report installed CLI-Anything harnesses in workstation health (§88) so the policy table knows the extra command surface. Both parked pending user approval + an ADR.
- **From gitresearch.md — worktree tool manifest (2026-09-24):** workstation emits a GitSwipe-tool manifest (available jarvisd commands + policy constraints) into each worktree so dispatched agents discover what they may use (their Phase 6.5 SKILL.md pattern; contract §144/§16). Small, v1-compatible — candidate for WEEK-06/07 tail work.
- **From gitresearch.md — semgrep diff-scanning gate (2026-09-24):** optional workstation capability — ExecutionGate runs semgrep on dispatched-task diffs as a pre-push validation gate (secret-laden / vulnerable patches flagged before the approval card renders). WEEK-11 scope; must stay an optional capability (§108), never a hard requirement. ADR when scheduled.
- **From gitresearch.md — patchwork adapter (2026-09-24):** patched-codes/patchwork as a post-v1 AgentAdapter target (§17) — GitSwipe dispatches surfaced vulnerability-fix opportunities to Patchwork. Needs ADR + policy profile.
- **From gitresearch.md — OpenHands adapter (2026-09-24):** All-Hands-AI/OpenHands named as a post-v1 AgentAdapter target alongside Harness (§53). Needs ADR when scheduled.
- **From gitresearch.md — binary-analysis radar type (2026-09-24):** if Project Radar ever grows a security-audit opportunity type (post-v1), the aws-project's RE tooling research (ghidra/radare2/frida family) is the reference list. Extremely parked.
- **LiteLLM documentation one-liner (2026-09-24):** WEEK-11 PROVIDER_GUIDE gets a note: self-hosted LiteLLM endpoints work via our OpenAI-compatible provider's base URL — zero code.
