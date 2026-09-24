# docs/ROADMAP.md — the WEEK ladder to production

> 13 weeks, WEEK-00 through WEEK-12, from foundation to the master acceptance scenario (contract §215).
> The authoritative detail lives in `weeks/WEEK-XX.md` — one file per week with scope, exit test, and handoff.
> Work only on the in-flight week unless the user redirects. A week is DONE only when its exit test passes and SESSION-STATE.md says so.

| Week | Theme | Exit test | Status |
|---|---|---|---|
| WEEK-00 | Foundation: docs system, monorepo, protocol/policy/providers cores, daemon CLI | typecheck + full test suite green; resume protocol works from docs alone | ✅ DONE (2026-09-24) |
| WEEK-01 | Provider completeness: all adapters full (models/health/stream), model routing, OS credential store for BYOK | provider suite green incl. timeout/429/auth-failure mocks; key round-trips through OS store | PENDING |
| WEEK-02 | GitHub: OAuth/App config, ingestion (repos/issues/PRs), normalized entities, rate-limit handling | fixture-driven ingestion tests green; live auth flow documented + smoke-tested | PENDING |
| WEEK-03 | Discovery: candidate model, feed API, swipe persistence, skill graph v0, diversity, why-this/why-not | ranked feed served from fixtures; swipe persists and changes next ranking | PENDING |
| WEEK-04 | AI opportunity engine: repo analysis, evidence assembly, dedup pipeline, confidence gate, Reference mode, radar | an AI finding carries evidence + confidence + duplicate-check trail; dedup kills known issues | PENDING |
| WEEK-05 | Workstation daemon v1: identity, pairing codes, loopback+LAN transport, JSONL event journal, health, localhost API | phone(browser) pairs via code; events replay after reconnect; journal survives restart | PENDING |
| WEEK-06 | AgentGateway: OpenCode adapter (server HTTP/SSE → CLI fallback), mock agent, session machine wiring, worktrees | mock-agent session lifecycle E2E; OpenCode live session against a scratch repo | PENDING |
| WEEK-07 | Security integration: policy on exec path, credential broker, approval queue + replay protection, audit, redaction | §118 policy table enforced in real exec; approval replay + stale approval rejected; no secret in any log | PENDING |
| WEEK-08 | Web UI: full localhost experience (taste-skill + ui-ux-pro-max mandatory), event replay client, Puter optional auth | discover→swipe→session→approval flows in browser; design checklist passes | PENDING |
| WEEK-09 | Android: Capacitor wrap, secure storage, notifications, offline cache; debug APK builds | debug APK installs, pairs, supervises a session; offline replay works | PENDING |
| WEEK-10 | Hardening: reconnect/replay E2E, failure recovery, checkpoints, security fixtures, backpressure | §62 failure simulations pass; prompt-injection + traversal fixtures blocked | PENDING |
| WEEK-11 | Packaging + CI/CD: installers, release pipeline, signed-artifact path, complete docs | CI builds all artifacts; clean-machine install works | PENDING |
| WEEK-12 | Acceptance: master scenario §215 end-to-end + release checklist §207 | full 35-step scenario passes; v1 tagged | PENDING |

## Phase mapping (contract §177 → weeks)

- Phase 1 (foundation) → WEEK-00 ✅
- Phase 2 (auth/providers) → WEEK-01
- Phase 3 (GitHub discovery) → WEEK-02 + WEEK-03
- Phase 4 (AI opportunity engine) → WEEK-04
- Phase 5 (workstation) → WEEK-05
- Phase 6 (agent gateway) → WEEK-06
- Phase 7 (safety) → WEEK-07
- Phase 8 (production UX) → WEEK-08 + WEEK-09
- Phase 9 (hardening/packaging/acceptance) → WEEK-10–12
