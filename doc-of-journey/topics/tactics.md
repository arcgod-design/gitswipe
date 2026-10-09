# topics/tactics.md — tricks that already work

> Append when something saves time. Never delete entries.

## 2026-09-24

- **Workspace packages resolve TS source directly**: set `main`/`types` to `src/index.ts` in each internal package.json — no build step, vitest and tsc both happy, daemon imports just work.
- **JSON files via bash, not the write tool**: the write tool schema-parses raw JSON content as an object and rejects it; write .json files with PowerShell — but use the NO-BOM write: `[System.IO.File]::WriteAllText($path, $text, [UTF8Encoding]::new($false))`. PS 5.1 `Set-Content -Encoding utf8` adds BOMs that break tsx's package.json parsing.
- **vitest at root only**: single root `vitest.config.ts` with `packages/*/test/**` glob — no per-package test configs to drift.
- **Mock HTTP servers in tests**: always `res.end()` in handlers and `server.closeAllConnections()` before `server.close()` in teardown, or close hangs 10s per test.
- **CLI subcommands as positionals**: `npm run x -- --flag` gets eaten by npm for known flags; positional args (`npm run daemon -- check`) always pass through.
- **vitest upgrade path on npm 10**: vitest@4 crashes npm's arborist (edgesOut bug); 3 → 5 jump installs clean and covers the GHSA-82fw advisory.
- **`fetchOrThrow` choke point**: wrap every adapter fetch in one helper that maps `TimeoutError`/`AbortError` → TIMEOUT and everything else → NETWORK_FAILURE — adapters stop leaking raw TypeErrors, failover gets clean categories for free.
- **ASCII-safe test/code titles**: keeps PS regex passes and any encoding mishap from corrupting files; refer to contract sections as `s141` in code, `§141` in docs only.

- **Pairing screen = unauthenticated entry point**: order server middleware as [static files] -> [auth] -> [API routes]. The pairing screen must load without a token; everything under /api/ still requires Bearer auth.
- **Param vs no-param routes**: check exact-path routes (POST /api/session) BEFORE regex param routes (/api/session/:id) - the regex never matches the bare path, so an exact route nested inside it is dead code.
- **git show extraction + BOM scan**: after extracting files via git show, always scan for EF BB BF and strip. PowerShell redirect piping adds BOMs silently.
- **Recount ../ on copy**: relative static-path patterns break when the source file sits at a different directory depth than the file it was copied from. Recount, or anchor from import.meta.url with the verified level count.
- **settings.json = the user-intent persistence layer**: env overrides stay king (s116 dev discipline), settings.json records what the app UI changed (workRoot, providerId, model), defaults fill the rest. Atomic tmp+rename writes, same as the stores.
- **Reasoning-model pings**: maxTokens 300+ for any short chat test against reasoning models (nemotron-3 family); check usage vs content before suspecting the parser.
- **Two input classes by purpose**: .pair-input (uppercase mono, codes) vs .form-input (normal mono, general forms) - pick by whether uppercase display is the intent.
- **Tab-asymmetry bisect for 'Failed to fetch' in a multi-endpoint app**: check a KNOWN-GOOD endpoint in the same app (the Workstation tab) before touching code - server-alive + IP-check + browser-test all passed, and the asymmetry isolated the fault to one route in one minute.
- **Clamp learned signals at schema ceilings**: any additive learning signal that feeds a validated output (score in [0,1]) must be clamped where it is produced, with a test that over-boosts the graph and asserts the ceiling.