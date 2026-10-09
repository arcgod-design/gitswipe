# imagemode.md — visual verification tasks (2026-10-09 evening) — PROGRESS UPDATE

> VERIFIED SO FAR: feed = CLEAN (buttons contained, peek visible, fluid card, hint readable). Contract = CLEAN (live-agent chip, ai-refined chip, branch, model chain, nemotron goal, scrollable markdown, dispatch button). REMAINING: settings re-read (v3_s.jpg saved, image model errored - retry), session screen (capture during the final live rehearsal), desktop (user screenshots via Win+Shift+S), sync (verify during rehearsal).
> NOTE: the detached serve died once mid-verification (tool process-tree kill) - restarted with full state recovery. Keep the restart one-liner ready during the review.

> Context: review day. The app was substantially rebuilt since the last visual check. This file lists EVERY screen to capture and what to verify on each. Run the captures, then read each image and report defects with exact descriptions. Fix batch: one round, per impeccable's bounded-verify discipline.

## State you need to know

- Serve is running detached (`%TEMP%\opencode\serve-live5.log` or newer; kill via the port-7420 owner; relaunch: `$env:JARVIS_BIND="0.0.0.0"; Start-Process cmd "/c npx tsx apps/daemon/src/index.ts serve > ..."`).
- The phone is paired (token in localStorage) + the APK is the CURRENT build (if the APK was rebuilt after this file, reinstall first: `adb install --user 0 -r apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk`).
- Real data is live: feedRepos = expressjs/express, vercel/next.js, denoland/deno (settings.json). Feed should show REAL GitHub issues, not demo/* fixtures.
- Desktop = `http://127.0.0.1:7420` in the laptop browser (same UI).

## Capture pipeline (phone)

```powershell
$adb = "C:\Users\arc\AppData\Local\Android\Sdk\platform-tools\adb.exe"
cmd /c "$adb" shell screencap -p /sdcard/shot.png
cmd /c "$adb" pull /sdcard/shot.png "$env:TEMP\opencode\shot.png"
# then resize to ~500px wide JPEG before reading (System.Drawing)
```

Desktop: take screenshots with Win+Shift+S (Snipping Tool) into `%TEMP%\opencode\desktop-*.png` and resize the same way.

## Task list — capture + verify each

### 1. Mobile: pairing screen
- Force-stop + relaunch the app, `adb shell pm clear-storage` is NOT needed; if a token exists it goes to the feed, so to see pairing: relaunch after `adb shell pm clear` would wipe the token — SKIP that; verify the pairing screen only if unpaired.
- Verify: ONE "GitSwipe" wordmark, workstation URL field present with label, code field + Pair button CONTAINED INSIDE the card, no text overlap, comfortable mobile spacing.

### 2. Mobile: feed screen (THE priority check)
- Capture the feed with a card visible.
- Verify:
  - The Pass / "Work on this" buttons sit FULLY INSIDE the card — no spillover past the card edge, no overlap with the drag hint below.
  - The card grows with its content (chips + title + score + reasons + buttons all contained; if 4+ reasons render, the card must be taller, not overflowing).
  - The NEXT card peeks behind the top card (a dimmed card edge visible at the top of the stack = the depth cue).
  - "drag the card left to pass - right to work" hint is BELOW the card, fully readable, not overlapped.
  - Chips wrap cleanly (no chip clipped mid-word); score bar renders at 0-100%.
- If any card shows "below your bar - shown anyway": the chip must be amber/warn colored, not error-red.

### 3. Mobile: the contract screen (new screen)
- Tap "Work on this" on the top card → the Task contract screen.
- Verify: header with Back; chips row (live agent vs simulated - live=green chip, simulated=amber); model chain hint; the contract markdown card is scrollable (max-height ~half screen) with readable monospace, no horizontal overflow; the "Dispatch to the coding agent" button prominent + Not now secondary; while the AI analysis runs, the loading state shows.
- CRITICAL: the markdown must be legible on a phone (12.5px mono wraps, no clipping).

### 4. Mobile: session screen (live run)
- After dispatch (opencode backend): the event stream shows REAL opencode output lines, then file-changed/test events, then WAITING_FOR_APPROVAL with the Deny/Approve buttons.
- Verify: the timeline scrolls, timestamps aligned, the approval card shows the exact `git push origin <branch>` command, buttons reachable above the fold.
- If the run takes minutes, capture the mid-run state (agent messages streaming) AND the approval state.

### 5. Mobile: settings screen
- Verify the NEW sections render: "Coding agent" (backend select + model chain input + Save) and "Feed repositories" (textarea + Save) between the BYOK card and the Workspace card; no layout breakage; all labels above inputs.

### 6. Desktop (browser, http://127.0.0.1:7420): feed + contract + settings
- Capture: the desktop feed (wider layout - card centered ~760px), the contract screen with a real issue, the settings page with all sections.
- Verify: the desktop layout uses its width well (the container centers, cards not stretched edge-to-edge), the contract markdown reads well in the wider card, the settings sections stack cleanly, buttons aligned.
- The desktop feed should ALSO show the next-card peek.

### 7. Both: sync behavior
- Swipe on the desktop → relaunch/feed-refresh the phone → the ranking change should be visible on both (the feed reflects swipes from either surface). Capture before/after states.

## Report format (per defect)

Screen → element → what's wrong (exact visual description) → suspected CSS/component (if obvious). Batch ALL defects, then one fix round, then ONE confirmation pass. Stop after that (bounded verification).

## Known-good baselines (do not re-litigate)

- The slate-900/green design system, Space Grotesk/DM Sans/JetBrains Mono, phosphor icons - LOCKED (ADR 0005 + WEEK-08 seed).
- The score ceiling 1.00 with a full green bar is CORRECT (the clamp, by design).
- "below your bar - shown anyway" chips on cold-start real issues are CORRECT (honest ranking).
