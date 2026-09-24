# PROJECT-CORE.md — Jarvis: personal engineering agent network

## Vision (locked)

Jarvis = **GitHub opportunity discovery + personal engineering radar + AI coding-agent control plane + secure personal workstation gateway.** The user swipes through real engineering work (issues, stale issues, AI-detected opportunities, reference repos), turns accepted work into a rigorous task contract, dispatches it to OpenCode (or other agents) on their own PC, and supervises everything — approvals, follow-ups, takeover, diffs, tests, PR — from Android or localhost. Open source, self-hostable, provider-agnostic.

Not "an AI chatbot for GitHub". The core loop (contract §214): DISCOVER → UNDERSTAND → MATCH → SWIPE → PLAN → PREFLIGHT → EXECUTE → STREAM → TEST → REVIEW → APPROVE → SHIP → LEARN.

## Locked decisions

| # | Decision | Why | Date |
|---|----------|-----|------|
| 1 | Contract of record = `docs/source/JARVIS_PRODUCTION_BUILD_PROMPT.md` (216 sections). Its defaults (§210) govern anything not overridden here | User directive | 2026-09-24 |
| 2 | Greenfield build — `rest-things/` (SRS/UML PDFs) is reference material only; legacy UML concepts retained per contract §39 | Audit finding: no implementation exists | 2026-09-24 |
| 3 | **BYOK first-class, Puter optional, local models first-class.** A BYOK user must never be forced into Puter AI | Contract §0/§7; user reaffirmed in session | 2026-09-24 |
| 4 | OpenCode = first execution backend, behind Jarvis-owned `AgentGateway`/`AgentAdapter` interfaces. Hermes is a pattern reference, never a runtime dependency | Contract §18 | 2026-09-24 |
| 5 | Workstation daemon = Node/TS, same monorepo as everything else; one language, shared protocol package | Contract §181 greenfield defaults | 2026-09-24 |
| 6 | Web = React + TS + Vite; Android = Capacitor wrap of the same app; desktop shell (Tauri) optional later | Contract §181 + user confirmed Capacitor (has Android Studio) | 2026-09-24 |
| 7 | Monorepo: npm workspaces + TypeScript strict + zod (boundary validation) + vitest. Packages import workspace source directly (`main: src/index.ts`) — no build step in dev | ADR 0001 | 2026-09-24 |
| 8 | Policy engine = pure deterministic rule tables in `@jarvis/policy`; unmatched action → **APPROVAL_REQUIRED**, never silent allow; enforced below the LLM | Contract §25/§26/§117; ADR 0003 | 2026-09-24 |
| 9 | Approvals bind `action_hash` = SHA-256 of canonical JSON; expiry enforced; replay impossible by construction | Contract §58 | 2026-09-24 |
| 10 | Session identity = `JarvisSession` wrapper (jarvis_session_id, task, workstation, worktree, agent_session_id, event_cursor) — an OpenCode session id is never the whole identity | Contract §18.2 | 2026-09-24 |
| 11 | Transport: loopback default; LAN + private mesh (Tailscale/WireGuard) as optional providers; **no public SSH/port 22 exposure ever**; workstation dials out | Contract §24 | 2026-09-24 |
| 12 | One task = one isolated git worktree (`jarvis/<task-id>-<slug>` branches); protected branches never auto-modified | Contract §30/§134 | 2026-09-24 |
| 13 | `reasoning_path`/thinking = **execution plan + decision summary + tool log only**. No feature whose purpose is exposing private chain-of-thought | Session decision (github.md) | 2026-09-24 |
| 14 | GitHub content (README/issues/PR comments/code) = untrusted data, never authorization. Prompt-injection defense in depth | Contract §49/§50 | 2026-09-24 |
| 15 | Frontend work always runs the taste-skill pack + ui-ux-pro-max workflow (mandatory) | User directive | 2026-09-24 |
| 16 | Repo = `arcgod-design/gitswipe`, branch `main`. **No LICENSE file yet** — license deferred; repo stays effectively-private until the user picks one (MIT vs Apache-2.0 pending) | User directive | 2026-09-24 |
| 17 | Workstation continues autonomously when phone offline; mobile reconnect = event replay from cursor; durable local-first state on the workstation | Contract §21/§113 | 2026-09-24 |
| 18 | **Every dispatched task follows the ssoc git work pattern** (user's 80+ PR workflow): one worktree per issue (`<Repo>/issue-N/`), `feat/issue-N-slug` branches, fork→upstream PRs, `(closes #N)` commits, pre-push lint/test gates, PR lifecycle handling incl. CodeRabbit resolution + maintainer-blocked tracking — see `docs/REPO-WORK-CONVENTIONS.md` + ADR 0004 | User directive | 2026-09-24 |
| 19 | Task contracts carry an embedded `git_workflow` block (branch naming, remotes, gates, lifecycle rules) so agents receive the pattern in-band; workstation enforces deny-rules regardless of agent behavior | ADR 0004 | 2026-09-24 |
| 20 | **Public product name = GitSwipe.** "Jarvis" remains internal codename (`@jarvis/*` packages, `jarvis-workstation` protocol id, protocol types) — renaming them is churn + wire breakage; new ADR required to ever change | ADR 0005, user decision | 2026-09-24 |
| 21 | Contribution workspace root = **user-provided** (designated at workstation setup, WEEK-06 config); GitSwipe never defaults into an existing personal folder like ssoc | ADR 0005, user decision | 2026-09-24 |

## Verified facts (toolchain, this machine)

- Node v22.14.0, npm 10.9.2, git 2.54.0.windows.1, bun 1.3.6 (available but not used by this repo), Python 3.12.10
- Android Studio installed on the user's PC (Capacitor build path is real)
- OS: Windows (PowerShell 5.1). CI targets ubuntu; path code must handle both separators (see `@jarvis/policy` paths).

## Architecture map (high level)

- `packages/protocol` — domain contracts: ids, event envelope, session/task state machines, task contract (incl. `git_workflow` block per REPO-WORK-CONVENTIONS), opportunities, approvals+hashing, policy types, agent gateway interfaces, workstation handshake
- `packages/policy` — deterministic rule engine: evaluate/classify commands/paths + default safe ruleset (contract §26)
- `packages/providers` — `AIProvider` abstraction + OpenAI-compatible / Anthropic adapters + registry presets + Puter bridge shape + model routing (contract §7)
- `apps/daemon` — Jarvis Workstation entrypoint (grows per weeks/WEEK-05+)
- `apps/web` — React UI (WEEK-08, taste-skill pass), Capacitor wrap in WEEK-09
- Git work pattern for all dispatched tasks: `docs/REPO-WORK-CONVENTIONS.md` (ADR 0004)
- Full system diagram: `docs/ARCHITECTURE.md`

## Open questions (blocking nothing, answer when ready)

1. ~~Product name~~ — **RESOLVED 2026-09-24: GitSwipe** (public) / Jarvis (internal codename). ADR 0005.
2. License: MIT vs Apache-2.0 — must be locked before any public release.
3. GitHub App vs OAuth app vs PAT for v1 — contract prefers App/scoped OAuth (§8); decide at WEEK-02 start.
4. Puter app registration credentials — needed only for WEEK-08 optional path.
5. Workspace root folder — user will designate one (like ssoc) at WEEK-06 workstation setup.
