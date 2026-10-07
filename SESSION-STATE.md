# SESSION-STATE.md — as of 2026-10-07 night (session 21: D3 transport core + setup guide)

## Current sprint

Review **Oct 9 in the lab, over the PHONE HOTSPOT** (venue locked). D3 transport core DONE + live-verified. Setup guide shipped (startup_and_setup_guide.md, laptop + mobile separately).

## Stack state

- Branch: dev. **193/193 tests**, typecheck clean. APK: 4.5 MB (built).
- Live-verified tonight: CORS preflight 204 + echoed origin, cross-origin pair/feed 200 with ACAO, evil origin 403 (s149 preserved), LAN banner prints the mobile URL when bound beyond loopback.
- ADR 0009 locked: hotspot primary, cloudflared secondary, `jarvisd share`+QR post-review, owned relay v1.x. Tailscale dropped.

## Remaining before the review (D3 tail + D4)

1. USER: firewall rule (one-time admin command - in the runbook + guide).
2. USER: phone USB debugging + plug in -> `adb install` the APK.
3. USER: PAT rerun (`npm run daemon -- secret set github:token`) -> `github check` -> then I wire real-repo candidates into the feed (fixtures stay as fallback).
4. ME: hardening pass - no-hidden-retry audit (@jarvis/github writes), reconnect/replay E2E, Lighthouse.
5. ME+USER: rehearsal on the hotspot path end-to-end (laptop serve -> phone pair -> swipe -> session -> approve -> COMPLETED), backup recording.

## Docs health

startup_and_setup_guide.md (new, user-facing, both platforms); ADR 0009 + docs/TRANSPORT-DECISION.md; NEXT-TASKS runbook; SESSION-STATE/daily/state files current.