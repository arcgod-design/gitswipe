# docs/REPO-WORK-CONVENTIONS.md — mandatory git work pattern for every dispatched task

> Source of truth: the user's proven ssoc workflow (`C:\Users\arc\OneDrive\Desktop\ssoc\ssoc\CLAUDE.md`, 80+ PRs).
> When Jarvis dispatches a task to OpenCode (or any agent), the task contract embeds these rules and the
> workstation enforces them. An agent session that deviates from this pattern is a policy violation, not a style choice.

## 1. Folder + worktree layout (one issue = one worktree)

```text
<workspace-root>/<OwnerRepo>/issue-<N>/          # git worktree, branch feat/issue-<N>-<slug>
<workspace-root>/<OwnerRepo>/issue-<M>/          # another issue, another worktree, no shared state
```

- Worktrees are grouped under a folder named after the target repository.
- NEVER two tasks in the same worktree. NEVER work directly on `main`/`master`.
- Worktree creation recipe (workstation runs this, not the agent):
  `git fetch upstream main` → `git worktree add ../issue-<N> -b feat/issue-<N>-<slug> upstream/main`

## 2. Remotes + identity (fork-based contribution)

- `origin` = the user's fork (`arcgod-design/<Repo>`), `upstream` = the target repo.
- Push goes to `origin`; PR goes `origin:feat/... → upstream:main`.
- Commit identity: `user.name="Archit Adish Gupta"`, `user.email="arcgod-design@users.noreply.github.com"`
  (per-workstation config; never the agent's identity).

## 3. Branch naming

| Task source | Branch |
|---|---|
| GitHub issue #N | `feat/issue-<N>-<short-slug>` |
| Bug-fix sourced from issue #N | `fix/issue-<N>-<short-slug>` (feat/ prefix for features) |
| AI-detected opportunity (no issue yet) | `feat/jarvis-<short-task-id>-<short-slug>` — issue first if the user enables issue creation (contract §69) |

## 4. Commit + PR conventions

- Conventional commits, first line carries the closing keyword: `feat: add X (closes #N)`.
- PR title mirrors the commit; PR body written to a temp file and created via `gh pr create --body-file` (never inline shell strings with user text).
- PR body includes: what, why, how tested (actual commands + results — no invented "all tests pass"), linked issue.
- No force-push, no remote changes, no protected-branch pushes — these are policy-DENY regardless of any instruction (contract §26, enforced below the LLM).

## 5. Pre-push gates (must pass before `git push`, enforced by the workstation)

1. The repo's own lint/format suite (ruff / prettier / eslint — whatever the repo configures) is clean.
2. The repo's test suite runs, or the failure is proven pre-existing on `upstream/main` (compare against base).
3. Commit messages match the convention; closing keyword present when the task sources from an issue.

## 6. PR lifecycle handling ("if any issue in PR, handle it accordingly")

| Situation | Required handling |
|---|---|
| CI red on our changes | fix on the same branch, push to the same PR; never open a replacement PR for the same issue |
| CI red pre-existing on upstream base | document in the PR body ("pre-existing on `main`, commit X proves it"), do not chase unrelated breakage |
| CI blocked on maintainer (Vercel authorize, required reviews, branch protection) | record as maintainer-blocked in the task ledger; surface to the user; do not retry-loop |
| PR CONFLICTING / DIRTY | rebase onto `upstream/main`, resolve, re-run gates, force-with-lease is still forbidden — rebase then normal push to the same PR branch |
| PR closed due to conflicts | new clean PR from a fresh worktree, link the old PR, close the loop in the ledger |
| CodeRabbit (or any bot) review comments | triage every comment: apply the fix on-branch as a resolution commit, or justify skip; never leave bot review comments unaddressed on a mergeable PR |
| Maintainer review feedback | apply on the same branch/PR; record the feedback hash; re-run gates |
| Fork drifted from upstream | sync fork before new work; verify `mergeStateStatus` before reporting "ready" |

## 7. Task ledger (per repository workspace)

The workstation maintains, per repo folder, a ledger of: issue → branch → PR → state (open/merged/conflicting/blocked) → CI summary → review-measure status (CodeRabbit resolved? maintainer-blocked?). This mirrors the ssoc CLAUDE.md tracking table and is the data behind Jarvis's Work/Activity screens. Blocked-on-maintainer items generate `USER-THING-TO-DO`-style notifications, never silent retries.

## 8. Where this is enforced

- Task contract composition embeds §1–§5 into the contract's `git_workflow` block (`@jarvis/protocol`).
- The workstation policy engine (WEEK-07) enforces deny-rules (force-push, remote change, protected push) at execution time.
- The worktree manager (WEEK-06) creates folders/branches per §1–§3 — the agent never creates its own branch topology.
- PR lifecycle handling (§6) is the agent-followup loop: workstation watches PR state via `gh` and queues follow-up work per the table above; maintainer-blocked → notify.
