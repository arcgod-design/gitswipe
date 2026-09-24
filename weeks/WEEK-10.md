# WEEK-10 — Hardening: reconnect E2E, recovery, checkpoints, security fixtures, backpressure

> Exit test: contract §62 failure simulations pass; prompt-injection + path-traversal + symlink fixtures are all blocked; a 5k-lines/sec terminal burst doesn't kill the client; workstation restart mid-task resumes from checkpoint.

## Scope

- Failure classification + recovery matrix wired for real: network, provider, agent process, protocol, dependency, test, build, permission, policy denial, GitHub-state-changed, worktree, disk, auth (§32). Dangerous actions never retried blindly (§191).
- Reconnect/replay E2E: phone offline → PC continues → reconnect → replay; workstation restart → session reconciliation, unrecoverable sessions marked explicitly (§21, §152, §112).
- Checkpoint resume: task restarts continue from safe points (§33).
- Security fixtures (§206): README prompt-injection, issue-with-shell-command, symlink worktree escape, path traversal (`..`, junctions, UNC, device paths), fake tokens in logs, malicious postinstall — all must fail closed.
- Backpressure: batching, bounded queues, sequence discipline, UI throttling (§196); large repo handling: shallow/incremental strategies (§198).
- Cancellation propagation through the whole chain (§193); timeouts everywhere except long-running sessions (which get heartbeat/idle logic, §192/§195).
- Concurrency locks: session/worktree/branch/approval leases (§194); parallel-agent safety (§91).

## Notes

- This is adversarial testing of everything built so far. Expect fixes across packages; that is the point.
