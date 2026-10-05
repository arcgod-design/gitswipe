# SESSION-STATE.md — as of 2026-10-04 (session 18: D1 of the 4-day demo sprint)

## Current sprint

**4 days to a fully-working prototype** (show date ~2026-10-08; the ma'am needs a working prototype). D1 ✅ DONE. The WEEK ladder still holds — D-plan maps onto weeks 09-12.

## Stack state

- Branch: dev. **180/180 tests**, typecheck clean.
- BYOK is DONE ON THE APP: provider select + key store/remove (OS secret store, DPAPI) + live provider test — nvidia-nim + `nvidia/nemotron-3-super-120b-a12b` verified live through the app ([OK], 1278ms).
- Workspace root shipped: user folder (e.g. ssoc) or auto-created default; absolute-path validated; shown in Settings + serve banner.
- NVIDIA key is in the OS store (`provider:nvidia-nim`). ROTATE IT AFTER THE DEMO — it was pasted in chat once. 40 req/min limit noted; rate-budget handling exists in the provider stack.

## Verified this session

- `npm run typecheck` → clean · `npm test` → 180/180 (9 new settings tests)
- Live: serve → pair → GET /api/settings → save provider → POST test → **nemotron replied [OK]** → workroot set → folder created on disk
- Research: stablyai/orca (competitor + reference) + CopilotKit OpenBot/OpenDots/OpenMuse + Anil-matcha/open-dots — all verdicted in gitresearch.md; 5 orca SUGGESTIONS approved by user; 3 sprint skills installed (capacitor-best-practices, argent-android-emulator-setup, playwright-best-practices)

## Known pain points

- Reasoning models burn hidden tokens before visible content: maxTokens 20 and 100 both returned EMPTY replies from nemotron; 300 works. Set test pings to 300+.
- Daemon default dataDir is `./data` (not `.data`) — the JARVIS_DATA_DIR footgun from errors.md struck again in a smoke script.
- Global search-replace hit PairScreen's intentional uppercase `.pair-input` — scope replaces to the target component.

## Next concrete steps (D2 — 2026-10-05)

1. **Self-learning v1.5** (the demo differentiator, scoped in NEXT-TASKS): outcome feedback (COMPLETED sessions boost the card's language/topic weights — closes Execute→Discover), topic tags beyond languages, recency decay. Prove with the WEEK-03 exit-test pattern: outcome measurably changes the next ranking.
2. Capacitor: init, wrap apps/web, secure storage for the device token, LAN pairing to the daemon (skills installed; Android Studio confirmed installed).

## Docs health

All surfaces synced this session; state files updated; daily log 2026-10-04-18.md.