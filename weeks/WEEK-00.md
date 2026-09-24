# WEEK-00 — Foundation: docs system, monorepo, protocol/policy/providers cores, daemon CLI

> Exit test: `npm run typecheck` + `npm test` green; resume protocol works from docs alone (a cold session can rebuild state from `weeks/` + `SESSION-STATE.md` without any chat history).

## Scope (contract §177 Phase 1)

- Repository audit (contract §212) — finding: greenfield, `rest-things/` is spec material only.
- Documentation system (Astro/lattice pattern): CLAUDE.md, PROJECT-CORE, PROJECT_STATUS, SESSION-STATE, NEXT-TASKS, USER-THING-TO-DO, SUGGESTIONS, docs/{VISION,ARCHITECTURE,ROADMAP,REPO-WORK-CONVENTIONS}, weeks/ ladder + memory protocol, doc-of-journey/{daily,decisions,topics}.
- Monorepo: npm workspaces, TS strict base config, vitest, CI workflow.
- `packages/protocol`: ids, event envelope + sequencing, session state machine (16 states, validated transitions), task lifecycle + TaskContract v1 (+ markdown render, + git_workflow block), opportunity model (8 kinds, swipe reasons, evidence), approvals (canonical-JSON action hashing, expiry), policy types, AgentGateway/Adapter/JsonvisSession interfaces, workstation handshake, failure categories.
- `packages/policy`: deterministic rule evaluation (priority, explainable results, unmatched → APPROVAL_REQUIRED), command classification (git/read/build/network per contract §26), path sandbox (traversal, blocked paths, windows drives), table-driven tests per contract §118.
- `packages/providers`: AIProvider abstraction (contract §7.1), OpenAI-compatible adapter (chat/stream/listModels/healthCheck — covers OpenAI/OpenRouter/Ollama/Gemini-compat), Anthropic adapter, registry presets, model routing, retry-once on 429, error→failure-category mapping, mock-server test suite. Puter client-bridge shape = PROTO (WEEK-08).
- `apps/daemon`: CLI entrypoint (`--version`, `--check` preflight-lite, `--serve` reports not-implemented honestly).
- ADRs 0001–0004. `.env.example` (contract §48). CI workflow (contract §63 start).

## Rolling handoff (update every session)

- **Date**: 2026-09-24 (session 5)
- **In-flight week**: WEEK-04 — ✅ DONE (dedup v0, finding pipeline w/ evidence+confidence gate, analysis prompts w/ untrusted-content rule, reference mode, project radar). NEXT: WEEK-05.
- **Stack state**: see `SESSION-STATE.md` (as of 2026-09-24). 116/116 tests, 5 packages + daemon CLI.
- **Next concrete step**: start WEEK-05 per `weeks/WEEK-05.md` — the daemon becomes a real long-running process: config precedence, device identity + pairing codes, loopback+LAN transport, JSONL event journal with replay, localhost API with auth, health/heartbeats, durable task queue.
- **Blockers**: user items in `USER-THING-TO-DO.md` (#5 PAT for live GitHub smoke; BYOK key for live AI smoke — all engines are mock-tested and need nothing to proceed).
