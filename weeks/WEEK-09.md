# WEEK-09 — Android: Capacitor wrap, secure storage, notifications, offline, debug APK

> Exit test: a debug APK installs, signs in, pairs with the workstation, and supervises a live agent session end-to-end; offline replay works; notifications fire on approval requests and completions.

## Scope

- Capacitor wrap of the WEEK-08 web app; Android-first (contract §38); Android Studio present on the user's PC.
- Platform secure storage for tokens/pairing identity (§151); never localStorage for secrets on mobile.
- Push/local notifications for: approval needed, agent completed/failed, workstation connect/disconnect, security findings (§72 — meaningful events only, no spam).
- Offline behavior: cached feed, task state, event replay on reconnect (§21); the phone going offline must never stop the PC (exit test includes airplane-mode mid-session).
- Build: debug APK via CI + local; AAB pipeline configured; NO signing keys in the repo ever (§38).
- Deep links where needed for approval notifications.

## Notes

- Mobile is discover/decide/monitor/approve/intervene — NOT a desktop IDE (§4.4).
