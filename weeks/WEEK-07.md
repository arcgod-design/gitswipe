# WEEK-07 — Security integration: policy on the exec path, credential broker, approvals, audit, redaction

> Exit test: the contract §118 policy table is enforced in a real execution path; approval replay and stale/expired approvals are rejected; no secret appears in any log, journal, diff, or PR body; every consequential action produces an audit record.

## Scope

- Policy engine wired into the daemon execution path: every agent action request → PolicyResult (ALLOW / APPROVAL_REQUIRED / DENY) with explainable rule provenance (§25, §117); deny + audit event on block (§25.2).
- Command/filesystem/network policies at execution time: argv-based execution (no naive shell strings, §85), path sandbox with symlink/traversal/junction/UNC awareness (§84), blocked secret paths (§26), network destinations per rule.
- Credential broker: scoped, short-lived tokens for GitHub push/PR operations instead of exposing long-lived creds to agent shell (§27); OS store from WEEK-01 is the only secret home.
- Approval queue: approvals bind action_hash + payload hash + policy_version + expiry (§58); idempotent, authenticated, tied to exact action (§28); deny path tested.
- Audit journal: append-only records for logins, pairings, policy changes, approvals, commits, pushes, PRs, credential uses (§114).
- Redaction: secret-pattern scanners for terminal streams, logs, diffs, PR bodies before any display/upload (§74, §145); "potential secret detected → output withheld" path.
- Localhost auth hardening: loopback token, origin checks, no wildcard CORS (§148–§150).

## Notes

- The LLM is never the security boundary. Repository content stays untrusted data (§49/§50) — injection fixtures get their full adversarial pass in WEEK-10, basic defense now.
