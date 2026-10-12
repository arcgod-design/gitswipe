# whynot.md — why GitSwipe is NOT production ready (the brutal audit)

> The user asked for this file directly. Every point below is a real gap, verified against the running system. No hedging. No "it's mostly done." This is the list that stands between the current state and a product strangers could install and trust.

---

## 1. THE FEED IS NOT PERSONAL — it's a hardcoded demo

**What's wrong:** The feed only shows issues from 3 hardcoded repos (`expressjs/express`, `vercel/next.js`, `denoland/deno`). It does NOT:
- Discover repos the user actually works on
- Read their GitHub profile, contributions, or starred repos
- Learn their skill graph from their actual code
- Suggest repos/issues based on who they are

**Why it matters:** The product's core promise is "finds GitHub work worth doing FOR YOU." A feed that shows express issues to everyone is a demo, not a product.

**What's needed:** The user's GitHub identity as the discovery seed — their repos, their contribution history, their languages. The skill graph engine (WEEK-03/04) exists but is fed by fixture data + swipes, never by the user's actual profile.

---

## 2. CARDS RUN OUT — no refill

**What's wrong:** The user swipes all cards → empty feed → nothing comes back. The feed is a one-shot snapshot loaded at serve start.

**Why it matters:** A Tinder app with no new cards is dead. The user waits, sees "That's every card," and closes the app.

**What's needed:** A background refresh cycle: when the feed runs low, re-ingest from GitHub (search, trending, user's repos), re-rank, and push new cards into the feed.

---

## 3. THE WORK SCREEN IS DECORATIVE for SAVED items

**What's wrong:** SAVED items in the Work screen are not clickable — they have no dispatch path. Only sessions that are already RUNNING link to their session detail. The user swipes right (intent to work), then the Work screen shows "SAVED" and does nothing.

**Why it matters:** The s4.2 flow says RIGHT = save and OPTIONALLY START WORK. The Work screen is the missing "start work" — the user should be able to tap a SAVED item and dispatch it.

**What's needed:** Tap SAVED → the contract screen → dispatch. The API already accepts any candidate key; the UI just doesn't wire it.

---

## 4. THE RUNNING ZOMBIE SESSION

**What's wrong:** The user sees one agent stuck in RUNNING on their phone. It's a session from a previous serve that the sequential queue now blocks ALL new dispatches behind (the `hasActiveSession()` guard).

**Why it matters:** A zombie RUNNING session means:
- No new dispatches can start (the sequential guard sees it as active)
- The Work/Agents screens lie about what's happening
- The user can't kill it from the UI

**What's needed:** Session recovery on serve restart (detect sessions that were RUNNING before the restart but have no live process → mark them FAILED or resume them), plus a "Stop" button on the session detail screen.

---

## 5. NO OFFLINE/RECONNECT — the phone loses everything

**What's wrong:** The phone app has no offline cache. If the connection drops mid-session:
- The SSE stream dies silently (the reader gets an error but doesn't auto-reconnect)
- The feed is not cached (opening the app offline = blank screen)
- Event replay from a cursor exists in the protocol but the UI doesn't use it on reconnect

**Why it matters:** The contract (s21) says "the phone being offline must not stop the PC agent." The PC side works (the daemon keeps running). But the phone can't RECONNECT and REPLAY — the s21 test (airplane mode mid-session, reconnect, events restored) has never been run.

---

## 6. THE ONE-CLICK SETUP IS WINDOWS-ONLY

**What's wrong:** `start-gitswipe.bat` works on Windows. There is no macOS/Linux equivalent. The contract (s2.6) requires one-click for Windows + macOS + Linux + Android.

**What's needed:** At minimum a `start-gitswipe.sh` with the same flow, and a macOS/Linux secret-store verification (the DPAPI store is Windows; keychain/libsecret are PROTO).

---

## 7. NO RELEASE APK — only debug

**What's wrong:** The APK is a debug build. No signing config, no AAB pipeline, no release channel. The contract (s38) says: "Do not commit signing keys" but also "deterministic Android build configuration and CI workflow that produces an unsigned/release artifact."

**What's needed:** A `assembleRelease` + `bundleRelease` gradle config that CI can build, unsigned, on every push.

---

## 8. THE STATE IS IN-MEMORY FOR THE ACTIVE SESSION

**What's wrong:** While the journal persists session HISTORY (the list survives restarts), the ACTIVE session state (the adapter's `this.state`, the current model, the opencode process handle) lives only in the daemon process. A daemon restart mid-run orphans the opencode process (now partially fixed by tree-kill, but the session state itself is lost — it becomes a zombie RUNNING in the journal that never resolves).

**Why it matters:** The user's machine sleeps, the daemon dies, the agent's work is orphaned. The session shows RUNNING forever.

---

## 9. NO TESTS FOR THE LIVE PATHS

**What's wrong:** 191 tests cover the deterministic core (protocol, policy, gateway, discovery). But the LIVE integration paths — the opencode adapter's file transport, the gh CLI calls, the nemotron analysis — are only verified by manual live tests. No E2E test runs the full loop (feed → dispatch → approval → PR) automatically.

**Why it matters:** Every code change could silently break the live path and all 191 tests still pass.

---

## 10. SECURITY GAPS

**What's wrong:**
- The execution gate tests use scratch repos, not the real worktree flow
- The s26 policy table is tested but the live agent (opencode) runs OUTSIDE the gate — opencode spawns its own child processes that aren't individually gated
- No CSRF token on the API (the origin-lock helps but isn't complete)
- No rate limiting on the API surface
- The `.env.example` shows a pattern that encourages `.env` files (the OS store is the real path, but the hint exists)
- Session tokens are stored in `localStorage` on the web — not platform secure storage (the contract s7.3 says "browser localStorage when a safer mechanism is available")

---

## 11. THE SKILL GRAPH IS SEED-FIXED

**What's wrong:** The graph starts with `["TypeScript", "TypeScript", "Python"]` hardcoded. The user's actual skill profile — their languages, frameworks, contribution patterns — never enters the graph. It only learns from swipes AFTER the user starts using it. The cold-start experience is fake.

---

## 12. NO DATA MIGRATION / VERSIONING

**What's wrong:** `settings.json`, `sessions.jsonl`, `swipes.jsonl` have no version fields and no migration logic. A schema change in any of them breaks existing installations silently.

---

## 13. THE DESKTOP APP IS A BROWSER TAB

**What's wrong:** There is no desktop application. The user opens a browser tab. The contract (s37) specifies a desktop shell with system tray, auto-updater, daemon management. The browser tab works but is not a desktop product.

---

## SUMMARY: The honest verdict

**GitSwipe is a working prototype with a proven architecture.** The loop works end to end (PR #7520 proves it). The code quality is real (191 tests, strict TS, honest labels). The security design is thoughtful (policy below LLM, hash-bound approvals, brokered secrets).

But it is NOT production ready because:
1. The core experience (the feed) is a demo, not personal
2. Cards run out with no refill
3. The Work screen doesn't complete the user's intent
4. Sessions can zombie-block everything
5. The phone has no offline resilience
6. Setup is Windows-only
7. No release builds exist
8. Active sessions die with the daemon
9. Live paths have no automated tests
10. Security gaps in the live agent path
11. The skill graph is cold-start-fixed
12. No data versioning
13. No desktop application

**The gap is not architecture — it's last-mile completeness.** The foundation is solid. Every issue above is solvable within the existing codebase. But shipping today would mean shipping a demo that looks like a product, and a user who installs it will hit issue #1 (the feed) within 30 seconds and correctly conclude it's not real yet.
