# USER-THING-TO-DO.md — things only the user can do

> If a task is waiting on you, it will be listed here. Never put secrets in chat — put them in the OS store via `jarvisd secret set <key>`.

| # | Item | Needed by | Status |
|---|------|-----------|--------|
| 1 | ~~Confirm the product name~~ — **RESOLVED: GitSwipe** (ADR 0005) | — | ✅ DONE |
| 2 | **Pick a license** (MIT vs Apache-2.0). No public release before this. | WEEK-11 | OPEN |
| 3 | ~~GitHub App / OAuth~~ — **superseded by ADR 0006** (PAT is v1 auth) | — | ✅ RESOLVED |
| 4 | ~~Puter~~ — **PARKED** (post-demo) | — | ✅ PARKED |
| 5 | ~~BYOK test key~~ — **RESOLVED**: NVIDIA key in the OS store, nemotron verified | — | ✅ DONE (rotate after demo) |
| 5b | ~~GitHub PAT~~ — **STORED + live** (arcgod-design, 4999/5000). Rotate after the demo (it was pasted in chat). | — | ✅ DONE (rotate) |
| 6 | ~~Android SDK~~ — **DONE** (all components verified, cmdline-tools hand-registered) | — | ✅ DONE |
| 7 | ~~Workspace root~~ — **DONE** (the ssoc folder; auto-discovery active) | — | ✅ DONE |
| 8 | **Review the parked SUGGESTIONS.md items** | post-v1 | OPEN |
| 9 | ~~Tailscale~~ — **REMOVED by ADR 0009** (Cloudflare tunnel is the transport) | — | ✅ REMOVED |
| 10 | ~~Firewall rule~~ — **NOT NEEDED** with the tunnel (the daemon stays loopback; cloudflared dials out) | — | ✅ N/A |
| 11 | ~~Phone plug-in~~ — **DONE** (USB debugging on, APK installed, paired through the tunnel) | — | ✅ DONE |

## Remaining items

1. **License** (#2): pick MIT or Apache-2.0 before any public release
2. **Rotate the NVIDIA key + GitHub PAT** after the demo (both were pasted in chat)
3. **Review SUGGESTIONS.md** (#8): promote or kill each parked idea