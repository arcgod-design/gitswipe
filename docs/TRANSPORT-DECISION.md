# TRANSPORT-DECISION.md — remote access: brutal verification + selection (2026-10-07)

> The user's requirement (product north star): *"user sets up GitSwipe on the laptop, downloads the app on mobile, adds API key + model, and walla — done."* No VPN apps, no accounts, no third-party sign-ups on the user side.
> Two separate decisions, per the user's directive: **(1) what runs the Oct 9 review**, **(2) what is the product path** (one-click / one-terminal-command).

## First, the honest correction

**The "Tailscale is only 1000 minutes" fear is factually wrong** for our case. The 1,000-minute/month pool applies ONLY to *ephemeral* resources (CI runners, short-lived containers). Persistent personal hardware — laptop + phone — is **unlimited user devices** on the free plan, forever (tailscale.md line 21 says exactly this, from the user's own research). If Tailscale were merely "free enough," it would stay.

**We still drop it.** The real reasons, which the user correctly smelled:
1. **UX vision violation:** forcing every user to install a third-party VPN app + create a third-party account on two devices is exactly the hassle the product must not have.
2. **Demo-day operational risk:** campus Wi-Fi blocking/degrading VPN coordination servers is common; debugging a VPN in front of the reviewer is a nightmare scenario.
3. **Dependency we don't control:** their pricing, their ToS, their uptime — for the product's core connectivity story.

## The physics (no magic exists)

Phone and laptop both sit behind NATs. A direct phone→laptop internet connection is **impossible** without one of:
- **(A) VPN mesh** — apps + accounts on both devices (Tailscale, ZeroTier, NetBird, Headscale)
- **(B) Public tunnel** — one process on the *laptop* dials out to a public endpoint; the phone talks to that URL with **zero installs** (Cloudflare Tunnel, Pinggy, Zrok)
- **(C) Our own relay** — both devices dial out to a service WE run; zero user-side installs; orca's architecture (already parked in SUGGESTIONS + contract §24)

Category B and C are the only ones compatible with "walla, done." Every alternative in tailscale.md falls into these three buckets.

## Brutal verification — all 8 candidates

| # | Option | Category | Zero user-side install? | Free for us? | Oct 9 demo | Product future | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **Tailscale (free plan)** | A | ❌ app + account on BOTH devices | ✓ (unlimited for personal devices) | risky on campus Wi-Fi | violates the walla-vision | **DROP** — docs-only power-user option |
| 2 | **Headscale (self-hosted Tailscale)** | A | ❌ still Tailscale client apps on both devices | ✓ OSS | ❌ needs VPS + domain + TLS + reverse proxy | ❌ we'd run a VPN control plane — heavy, wrong shape | **DROP** |
| 3 | **Cloudflare Tunnel (Quick Tunnel)** | B | ✅ **phone installs NOTHING** — it just gets an https URL | ✓ no account for Quick Tunnels, no usage limits | ✅ one binary + one command; genuine internet path on phone mobile data | ✅ short term, via `jarvisd share` (see below) | **SELECTED — demo primary** |
| 4 | **Pinggy** | B | ✅ | ⚠️ free tier: **60-minute sessions**, random URLs, rate limits | ❌ a demo session can outlive the tunnel | ⚠️ worse than #3 in every dimension | **DROP** |
| 5 | **Zrok** | B/C | ✅ phone yes | ⚠️ free SaaS needs an account; self-host needs a VPS | ⚠️ another binary + account; smaller ecosystem | ⚠️ same ceremony as #3 but less proven | **DROP** (revisit if Cloudflare ever fails us) |
| 6 | **NetBird (self-host)** | A | ❌ VPN clients on both devices + our own VPS | ✓ OSS | ❌ | ❌ more friction than Tailscale, and we'd host it | **DROP** |
| 7 | **ZeroTier** | A | ❌ apps + account + network join on both devices | ⚠️ free tier OK | ❌ same campus-Wi-Fi risk | ❌ | **DROP** |
| 8 | **Our own thin relay** (the orca pattern — both devices dial out to a service we run; relay pairs sessions with our existing single-use codes and pipes frames) | C | ✅✅ **the only option with ZERO third parties** | ⚠️ costs a ~$5/mo VPS (or free-tier Cloud Run) + build + E2E crypto work | ❌ **cannot be built + deployed + hardened safely in 2 days** | ✅ **this IS the product path** (contract §24 secure relay; ADR 0009 schedules it) | **SELECTED — product v1.x** |

## The selections

### 1) For the Oct 9 review — **Cloudflare Quick Tunnel (primary) + phone hotspot (fallback)**

- **Primary (real internet, mobile data):** one binary on the laptop —
  ```
  cloudflared tunnel --url http://127.0.0.1:7420
  ```
  → prints a live `https://xxxx.trycloudflare.com` URL → user types it once in the app's Workstation URL field → phone pairs from anywhere on Earth. The daemon **stays bound to loopback** — even safer than today (the tunnel process is the only thing that can reach it, dialing out). Token auth + pairing remain the security layer; URL is random + we shut the tunnel down after the review.
- **Fallback (zero internet, zero third parties):** laptop joins the **phone's hotspot** → app pairs to the laptop's hotspot IP. Guaranteed to work in any room, even with no campus internet. Needs the same daemon bind/origin extension as the primary path.
- **Both paths need the same daemon work** (D3): configurable `bind` beyond loopback + configurable origin allowlist (the phone WebView origin must pass the §149 origin lock). That is the only new code; it serves the product future too.
- **Tailscale is removed from the demo plan entirely.** The reviewer story: *"the phone talks to the workstation through an encrypted tunnel — same architecture our own relay will ship with in v1.x, documented in the ADR."*

### 2) For the product future — **`jarvisd share` now, our own relay in v1.x**

- **Immediate (post-review, ~1 day):** `jarvisd share` — a subcommand that downloads/invokes `cloudflared` as a subprocess, prints the public URL **and a QR code** in the terminal. Product setup becomes: install on laptop → `jarvisd serve` → `jarvisd share` → scan QR with the phone camera → app opens pre-filled with the URL → pairing code → done. **One terminal command, zero third-party accounts, zero phone-side installs.** This satisfies the user's "terminal command thing" requirement with existing free infrastructure.
- **v1.x (the real walla):** our own thin relay service (ADR 0009; orca's `relay-contract` is the MIT-licensed reference — frame shapes, close codes, splice state machine). Then `serve` connects out to the relay automatically and the setup story is: install app → open → it finds your workstation. No accounts anywhere, no third party, end-to-end ours. Needs its own ADR for hosting/cost/crypto before shipping.
- **Tailscale/ZeroTier/NetBird:** documented as optional power-user transports in the docs; never required, never in the core flow.

## What this means for the walla-vision checklist

| Vision step | Status |
|---|---|
| Setup GitSwipe on laptop | ✅ `npm run daemon -- serve` (installer packaging is WEEK-11) |
| Download app on mobile | ✅ APK built (D2) |
| Add API key + select model **in the app** | ✅ SHIPPED (D1 BYOK screen — OS secret store, live provider test) |
| Phone ↔ laptop over the internet, no user hassle | ✅ `jarvisd share` + QR (post-review) → ✅✅ owned relay (v1.x) |

*Reviewed and locked in ADR 0009. The relay was always the endgame — the user's push just moved it from "post-v1 door" to "the product path."*
