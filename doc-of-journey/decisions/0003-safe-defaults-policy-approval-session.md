# ADR 0003 — Safe defaults: policy evaluation, approval binding, session-state extensions

Date: 2026-09-24
Status: LOCKED

## Decisions

1. **Unmatched policy action → APPROVAL_REQUIRED, never silent ALLOW.** The contract's example rules (§26) don't cover everything; the safe default for an unknown action is "ask the human", not "allow". (Deny-everything-unknown would make normal repos unusable; allow-everything-unknown is a security hole. Approval is the correct middle.)
2. **Approvals bind `action_hash` = SHA-256 over canonical JSON** (sorted keys, deterministic separators) + `action_payload_hash` + `policy_version` + `expires_at` (contract §58). Canonical JSON implemented in `@jarvis/protocol` with tests; replay of an approval against a different action is impossible by construction.
3. **Session state machine**: contract §19 diagram extended with practical edges the diagram omits but reality requires — CANCELLED reachable from all active states; WAITING_FOR_AGENT ↔ RUNNING; DISCONNECTED → CANCELLED. Terminal states (COMPLETED/FAILED/CANCELLED) have zero exits. Transitions validated by code + tests; nobody flips booleans.

## Consequences

- `@jarvis/policy` + `@jarvis/protocol` are the enforcement pair; the LLM never decides security (contract §25).
- Any new transition needs a protocol change + test update — deliberate friction.
