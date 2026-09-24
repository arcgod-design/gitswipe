# WEEK-05 — Workstation daemon v1: identity, pairing, transport, journal, health

> Exit test: a browser/phone pairs via short-lived code; events replay after reconnect; the JSONL journal survives a daemon restart; loopback is the default bind and no port is exposed beyond loopback/LAN by default.

## Scope

- Daemon as a long-running process (replaces the WEEK-00 CLI stub's `--serve` placeholder): config precedence (defaults < global settings < workstation < task, contract §116), structured logs with ids + redaction-ready paths (§34).
- Device identity: durable device keypair + id; short-lived pairing codes (10-min expiry) → key exchange → revocable per-device identity (§23, §152). Pairing code never becomes the long-term credential.
- Transport v1: LocalLoopback + LAN behind a `TransportProvider` interface; outbound-only posture; versioned handshake `jarvis-workstation/1.0` with capability negotiation (§24, §107, §108).
- Event journal: append-only JSONL per session with monotonic sequence; replay-from-cursor + snapshot-on-gap (EVENT_HISTORY_GAP, §120/§121); local-first durability (§113).
- Localhost API: authenticated loopback session token for the UI (§148), CORS/origin locked down (§149).
- Health: workstation health report (agents available, git version, disk, policy version, heartbeat, §88) + heartbeats with recovery windows (§195).
- Task queue durability: accepted tasks survive restarts, never lost (§111/§112).

## Notes

- No database yet — JSONL journal + in-process indexes. SQLite arrives only when queries demand it (ADR required).
- Worktree manager basics land here (worktree create/verify per REPO-WORK-CONVENTIONS §1) because sessions need them; full agent runtime is WEEK-06.
