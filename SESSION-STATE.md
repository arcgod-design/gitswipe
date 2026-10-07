# SESSION-STATE.md — as of 2026-10-07 evening (session 20: ADR 0009 + D2 Android done)

## Current sprint

Review Oct 9. D2 COMPLETE both halves (self-learning v1.5 + APK). Transport re-decided per user push: **ADR 0009** — Tailscale dropped (the 1000-min fear was factually wrong, but the UX vision objection was right); demo via **Cloudflare Quick Tunnel** + phone-hotspot fallback; product via **`jarvisd share` (QR) then our own relay (v1.x)**.

## Stack state

- Branch: dev. 189/189 tests, typecheck clean. APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk (4.5 MB).
- Shipped + live-verified: BYOK on app, workspace root, nemotron ([OK] reply), self-learning v1.5 (outcome hook fires on COMPLETED).
- Daemon security posture UNCHANGED: loopback default, origin lock, pairing + device tokens. The tunnel makes the daemon SAFER for the demo (stays loopback-bound; only cloudflared reaches it).

## D3 (Oct 8) concrete steps

1. Daemon: configurable `bind` + `allowedOrigins` (settings.json + env override; deny-unless-allowed preserved) + tests.
2. cloudflared download + Quick Tunnel runbook; verify phone-on-mobile-data -> tunnel URL -> pair -> feed.
3. Hotspot fallback: laptop joins phone hotspot, bind LAN IP, verify pairing.
4. APK install on the phone (adb) once USB debugging is on.
5. PAT: rerun the store command (token reported stored but absent), `github check`, then real-repo candidates in the feed (fixture fallback stays).
6. Hardening: no-hidden-retry audit (@jarvis/github writes), replay E2E, Lighthouse.

## Known blockers (user)

- PAT rerun (U5b). Phone USB debugging. Rotate NVIDIA key post-demo.

## Docs health

ADR 0009 + docs/TRANSPORT-DECISION.md added; NEXT-TASKS D3/D4 re-scoped; SUGGESTIONS relay promoted; USER-THING-TO-DO rows 6/5b/9 updated; state files current.