# ADR 0004 — Dispatched tasks follow the ssoc git work pattern

Date: 2026-09-24
Status: LOCKED (user directive)

## Context

The user's `C:\Users\arc\OneDrive\Desktop\ssoc` workspace is a proven, high-volume fork-contribution
pipeline (80+ PRs tracked): one git worktree per issue (`<Repo>/issue-N/`), `feat/issue-N-slug`
branches, fork→upstream PRs with `(closes #N)` commit keywords, pre-push lint/test gates, and a
disciplined PR lifecycle (fix-on-branch, rebase-on-conflict, CodeRabbit bot-review resolution,
maintainer-blocked tracking). The user directed that every task Jarvis sends to OpenCode follows
this exact pattern.

## Decision

`docs/REPO-WORK-CONVENTIONS.md` becomes the mandatory execution convention for dispatched tasks:

1. One issue = one worktree under `<workspace-root>/<Repo>/issue-N/` (confirms and concretizes contract §30/§134).
2. Branch naming deviates from the contract's `jarvis/<task-id>-<slug>` suggestion: issue-sourced tasks use `feat/issue-<N>-<slug>` (user's real-world pattern); AI-opportunity tasks use `feat/jarvis-<short-id>-<slug>`.
3. Fork-based flow (`origin`=fork, `upstream`=target), fixed commit identity, conventional commits with closing keywords.
4. Pre-push gates (repo's own lint + tests) enforced by the workstation before any push leaves the machine.
5. PR lifecycle table (fix-on-branch / rebase-on-conflict / bot-review resolution / maintainer-blocked tracking) is required agent behavior, driven by workstation-queued follow-ups — not left to agent judgment.
6. A per-repo task ledger records issue→branch→PR→CI→review state; maintainer-blocked items notify the user, never retry silently.

## Consequences

- `@jarvis/protocol` TaskContract gains a `git_workflow` block (branch, remotes, commit/PR conventions, gates, lifecycle rules) so every dispatch carries the pattern in-band.
- WEEK-05 worktree manager and WEEK-06/WEEK-07 scope now include the ledger + PR-watch loop (`gh` CLI) — exit tests updated.
- Force-push stays DENY even for rebase pushes; rebases are pushed as normal fast-forward updates to the same PR branch where possible, otherwise the workstation performs the update under an explicit approval.
- The contract's generic worktree guidance (§30) remains satisfied; only naming/layout specifics are overridden by the user's proven pattern.
