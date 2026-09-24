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
