# ADR 0008 — Harness connection: our AgentGateway stays; munder-difflin's dual-plane pattern adopted

Date: 2026-09-24
Status: LOCKED (user asked for best-of evaluation: munder-difflin / Hermes OpenCode plugin / own logic)

## Inputs evaluated

1. **munder-difflin** (`chaitanyagiri/munder-difflin`, 7.9k stars, TS Electron, macOS-first) — studied via repo tree + SPEC.md.
   Architecture: a desktop "control room" over existing CLI agents. Each agent = a real `claude` process in a **tmux pane**; two data planes: **Event Plane** (Claude Code hooks → JSON events via IPC) + **Terminal Plane** (tmux pipe-pane raw bytes). Commands injected via tmux send-keys. Explicitly a viewer/controller, not a runtime.
2. **Hermes OpenCode integration** — dispatch model (run / long-running sessions / follow-up / resume / JSON output / isolated worktrees). Already our pattern reference since contract §18; ADR-era decision: ideas yes, dependency no.
3. **Own design (contract §17/§18)** — `AgentGateway` + `OpenCodeAdapter` with preference: headless HTTP/SSE server → ACP (JSON-RPC) → CLI JSON fallback. JarvisSession identity wrapper, event journal, approvals.

## Decision

**The core stays our own AgentGateway (contract §18 order unchanged).** Reasons:

- Product shapes differ: munder-difflin supervises sessions the *user already runs* (attach model). GitSwipe *dispatches* tasks from swipes (orchestration model) — we own session creation, contracts, worktrees, approvals, PR lifecycle. The attach model can't drive our core loop.
- munder-difflin's hooks event plane exists to patch Claude Code's lack of an API. **OpenCode HAS a first-class headless API** (HTTP/SSE + ACP) — exactly why the contract picked it. We don't need the workaround.
- Hermes stays a pattern reference (run/resume/follow-up semantics already reflected in the gateway interface). No new dependency; no runtime coupling.

**Adopted from munder-difflin (ideas, not code):**

1. **Dual-plane separation** (load-bearing in their design, useful in ours): structured JSON **event plane** (our journal: what happened, replayable, drives UI + approvals) stays strictly separate from the **raw terminal plane** (byte stream for humans). Our event journal already is the event plane; WEEK-06 must add an explicit raw-terminal channel for the Terminal tab rather than pretending structured events can replace it.
2. **Takeover via an attachable session vehicle**: when the user hits TAKE OVER (contract §29), they must land in a real interactive terminal of the same agent session. On macOS/Linux the proven vehicle is a tmux pane the daemon spawns per session (supervise via API/ACP, attach via tmux for takeover). On Windows (no tmux), takeover rides OpenCode's own session-continue path via its API/CLI. Per-OS takeover notes go into the WEEK-06 file.

**Explicitly not adopted:** attach-to-existing-panes supervision, Electron shell, avatar/floor UX, hooks patching, local-only restriction (our transport layer is separate).

## Consequences

- WEEK-06 scope gains: raw-terminal channel + tmux-spawned sessions on unix (takeover) + Windows takeover via OpenCode session-continue.
- No new dependencies; nothing copied from munder-difflin (MIT there, but we take architecture lessons only).
- The mock agent (M2, already merged into the demo path) already models the dual-plane: structured events in the journal; the M3 terminal tab will render a synthetic terminal plane.
