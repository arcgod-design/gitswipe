# ADR 0009 — Remote transport: tunnel now, owned relay next, VPN apps never

**Date:** 2026-10-07 · **Status:** LOCKED (user-approved) · **Supersedes:** the Tailscale-for-demo plan (was in the D3 row, 2026-10-04)

## Context

The product north star (user directive 2026-10-07): a user sets up GitSwipe on the laptop, installs the app on the phone, enters an API key + model in the app, and is done — no VPN apps, no third-party accounts. The Oct 9 review additionally needs a working phone↔laptop internet path. Physics: both devices sit behind NATs; a bridge must be one of (A) VPN mesh, (B) public tunnel, (C) our own relay. Full verification of all 8 candidates lives in `docs/TRANSPORT-DECISION.md`.

## Decision

1. **Oct 9 demo:** Cloudflare Quick Tunnel (primary — laptop-only `cloudflared tunnel --url http://127.0.0.1:7420`, phone installs nothing, daemon stays loopback-bound) **plus** phone-hotspot LAN as the offline fallback. Both need the same daemon work: configurable bind + configurable origin allowlist (§149 origin lock stays deny-by-default; allowlist becomes config).
2. **Product bridge (post-review):** `jarvisd share` — cloudflared as a subprocess; prints the public URL + a QR code in the terminal. One command, zero third-party accounts, zero phone-side installs.
3. **Product endgame (v1.x):** our own thin relay service — both devices dial out, sessions paired with the existing single-use codes, frames piped (orca `relay-contract` is the MIT reference; E2E encryption required before any user traffic ships). Separate ADR for hosting/cost/crypto when scheduled.
4. **VPN meshes (Tailscale/ZeroTier/NetBird/Headscale):** never required, never in the core flow. Documentation-level power-user options only.
5. **The 1,000-minute Tailscale fear was factually wrong** (that limit is ephemeral-CI-only; personal devices are unlimited on the free plan) — recorded so nobody re-litigates pricing; Tailscale is dropped for UX and dependency reasons, not cost.

## Consequences

- D3 scope changes: Tailscale setup steps removed; bind/origin-allowlist extension + `cloudflared` demo runbook added; `jarvisd share` becomes post-review v1.0 scope; the relay moves from SUGGESTIONS ("when the door opens") to the scheduled product path.
- The contract's local-first claim is preserved: the core loop never depends on any relay; the relay only carries supervision traffic, and the daemon never accepts inbound connections.
- Security posture unchanged: pairing codes + device tokens + origin lock remain the auth layers on any tunnel URL; demo tunnels are shut down after use.
