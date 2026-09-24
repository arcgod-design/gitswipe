# docs/VISION.md — GitSwipe (internal codename: Jarvis)

> The product north star. Change only when the user changes the product definition.

## One-liner

**GitSwipe is your personal engineering agent network: it finds GitHub work worth doing (and references worth knowing), turns what you accept into rigorous task contracts, executes them on your own PC through agents like OpenCode, and lets you supervise, intervene, approve and ship from your phone or browser — with your own AI keys, your own GitHub, your own machine.**

## What we're building (locked 2026-09-24)

- **Discover** — a swipe-first "GitHub Tinder" feed: real issues, stale issues, AI-detected opportunities (evidence-backed, never claimed unique), reference repos that help your current projects, project radar.
- **Decide** — swipe right → investigate evidence → task contract (goal, files, constraints, acceptance criteria, validation commands, security policy). Edit before executing.
- **Execute** — the contract goes to a coding agent (OpenCode first) on the user's own workstation, in an isolated worktree, behind a deterministic policy firewall. Approvals bind exact action hashes. No auto-push. No public ports.
- **Supervise** — live event stream, terminal, diff, tests, follow-up prompts, pause/resume, takeover, approvals — from Android or localhost. Phone offline never stops the PC.
- **Provider-agnostic AI** — Puter (optional convenience), BYOK (first-class), local models (first-class). Core flow must work without Puter, without any specific vendor, forever.
- **Open source, self-hostable, one-click installs** (Windows/macOS/Linux + Android APK), local-first state, honest docs.

## What "done" feels like (success criteria, contract §176/§215)

Install → sign in (Puter OR local mode) → connect GitHub → pair PC → see a feed that matches you → swipe right → task contract → preflight → OpenCode runs in a worktree → live events on your phone → approval appears with exact action + diff → approve → PR exists → disconnect phone mid-task and nothing breaks. That whole loop, end-to-end, is the v1 acceptance bar.

## What we are NOT building

- An AI chatbot for GitHub. The swipe loop and the supervised execution plane ARE the product.
- A mandatory Jarvis cloud. No central AI bill, no vendor lock-in, no telemetry dependence.
- A desktop IDE on the phone. Mobile = discover, decide, monitor, approve, intervene.
- A second UI codebase (React Native etc.) — Capacitor wraps the one web app.
- PostgreSQL/FastAPI/K8s monolith infrastructure for fashion. Local-first until a real workload demands more (ADR required to add any).

## Golden rules

- **Never claim as working what is only designed** — PROJECT_STATUS.md is the truth; labels WORKING/PROTO/ROADMAP.
- **BYOK-first.** Every flow is designed so the user's own key works without Puter.
- **The policy engine is the security boundary, not the prompt.** LLMs suggest; deterministic rules decide.
- **Repository content is data, not instructions.** Untrusted, always.
- **Evidence or it didn't happen.** No invented scores, no fake "unique bug" claims, no "all tests pass" unless tests actually ran.
