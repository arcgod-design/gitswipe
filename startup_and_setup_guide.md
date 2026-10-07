# startup_and_setup_guide.md — GitSwipe setup

> Two independent guides: **Laptop** (the workstation — does all the work) and **Mobile** (the supervisor — your remote control). Current as of 2026-10-07 (demo build; installers/package ships in a later release).
> Architecture reminder: repos, ranking, AI analysis, git worktrees, and the agent all run on the LAPTOP. The phone holds no secrets — only a revocable device token.

---

# PART 1 — LAPTOP (workstation setup)

## Requirements

- Windows 10/11 (the encrypted key store uses Windows DPAPI; macOS/Linux stores arrive later)
- Node.js 22+ — check: `node --version`
- Git 2.x — check: `git --version`

## 1. Install

```powershell
git clone https://github.com/arcgod-design/gitswipe.git
cd gitswipe
npm install
```

Verify the toolchain:

```powershell
npm run daemon -- check
```

This checks Node, git, and the policy engine. All must pass before anything else.

## 2. Start the workstation

```powershell
npm run daemon -- serve
```

You will see:

```
  GitSwipe workstation - serving on 127.0.0.1:7420 (dev_xxxx)
  UI: feed + sessions wired
  workspace: .\data\workspace (default - set a folder in Settings)

  Pair a device: jarvisd pair ...
```

Open **http://127.0.0.1:7420** in the laptop browser. You should see the GitSwipe pairing screen.
(If the page is blank/404: run `npm run build:web` once, then restart serve.)

## 3. Pair the browser

In a second terminal (leave `serve` running):

```powershell
npm run daemon -- pair
```

Prints a one-time code (valid 10 minutes). Enter it in the browser. Done — you are on the Feed.

## 4. Add your AI key (BYOK) — in the app

On the **Workstation** tab (gear icon):
- **Provider**: pick yours (NVIDIA NIM, OpenAI, OpenRouter, Gemini, Ollama, Anthropic, custom)
- **Model**: e.g. `nvidia/nemotron-3-super-120b-a12b`
- **API key**: paste it and press **Store key**

The key is encrypted in the Windows credential store (DPAPI) — it is never written to a file in plaintext and never leaves this laptop. Press **Test provider** — it must answer `OK`.

CLI equivalent (if you prefer terminals):

```powershell
npm run daemon -- secret set provider:nvidia-nim     # paste the key, Enter
npm run daemon -- health                            # JARVIS_PROVIDERS=nvidia-nim
```

## 5. (Optional but recommended) Connect GitHub

```powershell
npm run daemon -- secret set github:token    # paste the fine-grained PAT, Enter
npm run daemon -- github check               # must print your masked token + rate budget
```

PAT scopes (read-only): `Metadata`, `Issues`, `Pull requests`.

## 6. (Optional) Set your workspace folder

Workstation tab → **Workspace root**. Point it at an existing folder (e.g. where you do your GitHub work) or leave the default. Every approved action is confined to this folder — GitSwipe never touches anything outside it.

## 7. Let the phone reach the laptop (hotspot path — demo/primary)

**One-time (admin PowerShell):** Windows blocks inbound connections on Public networks (hotspots count as Public), so allow the workstation port once:

```powershell
New-NetFirewallRule -DisplayName "GitSwipe workstation" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7420
```

**Every time you want phone access:**

1. Phone hotspot ON; laptop joins it.
2. Start the workstation bound to the network:
   ```powershell
   $env:JARVIS_BIND = "0.0.0.0"
   npm run daemon -- serve
   ```
   The banner prints:
   ```
   LAN: http://192.168.x.x:7420  <- enter this in the mobile app
   ```
3. That URL goes into the mobile app (Part 2, step 2). Keep loopback binding (`serve` without the env var) when you are NOT sharing with the phone — it is the safest default.

**Away-from-hotspot option (optional):** run `cloudflared tunnel --url http://127.0.0.1:7420` — it prints a public `https://...trycloudflare.com` URL usable from any network. The daemon stays loopback-bound; shut the tunnel down when done.

## 8. Daily use

```powershell
npm run daemon -- serve      # the workstation
npm run daemon -- pair        # only when pairing a NEW device
npm run daemon -- devices list    # see paired devices
npm run daemon -- devices revoke <id>   # kill a lost phone's access instantly
```

Your data (settings, swipes, skill graph, journal, encrypted secrets) lives in `.\data\` — back up the folder, back up everything.

## Laptop troubleshooting

| Symptom | Fix |
|---|---|
| `serve` prints `EADDRINUSE` | Another instance is running, or pick `$env:JARVIS_PORT="7445"` |
| Browser 404 on the UI | `npm run build:web`, restart serve |
| `pair` works but app 401s | CLI and serve are using different data dirs — start both from the same folder (or set `$env:JARVIS_DATA_DIR`) |
| Provider test says no key stored | The key went to a different data dir — same fix as above |
| Phone can't connect | Same hotspot? Firewall rule created (step 7)? URL matches the banner exactly (http, not https)? |
| `origin not allowed` in a browser tool | Origins are allowlisted; add yours via `JARVIS_ALLOWED_ORIGINS="https://your.origin"` |

---

# PART 2 — MOBILE (the supervisor app)

## Requirements

- Android phone (Android 10+ recommended)
- The GitSwipe APK (`app-debug.apk`, built from this repo — currently a debug build; the Play-Store release is future work)

## 1. Install the app

**Via USB (recommended):**
1. Phone: Settings → About → tap **Build number** 7x → Developer options → **USB debugging ON**
2. Plug the phone into the laptop via USB
3. On the laptop:
   ```powershell
   adb install apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
   ```
   (accept the debugging prompt on the phone if it appears)

**Or sideload:** copy the APK to the phone (Drive/USB/whatever), tap it, allow "install unknown apps".

## 2. Connect to your workstation

1. Make sure the laptop side is running (Part 1, step 7): phone hotspot ON, laptop joined, `serve` running with the **LAN URL** visible in its banner.
2. Open **GitSwipe** on the phone. The pairing screen shows two fields:
   - **Workstation URL**: type the banner URL exactly — e.g. `http://192.168.x.x:7420` (leave it EMPTY only when using the browser on the laptop itself)
   - **Pairing code**: get it from `npm run daemon -- pair` on the laptop
3. Enter both → paired. The URL is remembered; next time you only need a fresh code if the URL or data changed.

## 3. What you can do from the phone

- **Feed**: swipe cards (approve / dismiss). Your swipes teach the ranking — a completed work session teaches it harder (that is the "learned from activity" you will see in the reasons).
- **Work**: start a session on a card — the agent works in an isolated git worktree on the laptop.
- **Supervise**: watch the session's event stream live; when the agent wants to push, you get an **approval card naming the exact action** — Approve or Deny.
- **Workstation tab**: check health, store/change your AI provider key + model (Test provider included), set the workspace folder.

## 4. Security notes (what the phone holds)

- The app stores a **device token** in the app's private storage — never your AI key, never your GitHub token. Those never leave the laptop's encrypted store.
- Lose the phone? On the laptop: `npm run daemon -- devices list`, then `devices revoke <id>` — the token dies instantly.
- The connection is plain HTTP inside your private hotspot (or an https tunnel when using cloudflared). Both are fine for the token-based auth model; the relay transport with end-to-end encryption ships in a later release (ADR 0009).

## Mobile troubleshooting

| Symptom | Fix |
|---|---|
| "pairing failed" | Code expired (10 min) or already used — issue a new one |
| Cannot reach workstation | Phone and laptop must be on the SAME hotspot; check the URL letter-by-letter; firewall rule must exist on the laptop (Part 1, step 7) |
| 401 after restart | Token revoked or data dir reset — just pair again |
| Feed loads but actions fail | The laptop's serve is still running? Same data dir? |

---

*Deep docs: `README.md` (overview) · `docs/ROADMAP.md` (ladder) · `docs/TRANSPORT-DECISION.md` (how remote access works) · `PROJECT_STATUS.md` (what honestly works).*
