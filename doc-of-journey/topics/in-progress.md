# topics/in-progress.md - current focus

- **Last completed**: D2 complete (session 19-20, 2026-10-07) - self-learning v1.5 (outcome feedback + topics + decay, live-verified) AND the Android half (Capacitor app + 4.5MB debug APK built).
- **Transport re-decided (ADR 0009, 2026-10-07)**: Tailscale DROPPED. Demo = Cloudflare Quick Tunnel (primary) + phone hotspot (fallback); product = `jarvisd share` (cloudflared subprocess + QR) then our own thin relay (v1.x). No VPN apps ever required. Full analysis: docs/TRANSPORT-DECISION.md.
- **Next (D3 - Oct 8)**: daemon bind + origin-allowlist extension (shared by both demo paths), APK install on phone, PAT rerun + real-repo feed, hardening (no-hidden-retry, replay E2E, Lighthouse), tunnel runbook.
- **D4 (Oct 9 - review day)**: rehearsal + walkthrough + backup recording.
- **Also open**: PAT not in store despite being reported stored (rerun needed); phone USB debugging.
- **Pointers**: SESSION-STATE.md, weeks/state/current.json, NEXT-TASKS.md (D-plan), docs/TRANSPORT-DECISION.md, ADR 0009.