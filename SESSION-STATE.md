# SESSION-STATE.md — as of 2026-09-24 (WEEK-00 complete)

## Current week

**WEEK-00** — ✅ **DONE.** Exit test passed: typecheck green (4/4 workspaces), test suite green (54/54, 7 files), daemon CLI runs (`version` + `check`), resume protocol in place (this file + weeks/ + memory-protocol).

## Stack state

- Node 22.14.0, npm 10.9.2, git 2.54. TypeScript 5.9, zod 3.25, vitest 5.0.1 (patched line, 0 audit vulns), tsx 4.20.
- Monorepo: `packages/{protocol,policy,providers}` + `apps/daemon`, npm workspaces, `main: src/index.ts` (no dev build step).
- 14 default policy rules; unmatched actions → APPROVAL_REQUIRED (ADR 0003).
- 54 tests: protocol (20) + policy (22) + providers (12). Runtime ~2s.

## Verified this session (exact commands, real outputs)

- `npm run typecheck` → all 4 workspaces clean
- `npm test` → 54/54 passed (vitest 5.0.1)
- `npm audit` → found 0 vulnerabilities
- `npm run daemon -- version` → `jarvisd 0.1.0 (node 22.14.0, win32)`
- `npm run daemon -- check` → git ✓ node ✓ policy 14 rules ✓ preflight OK

## Known pain points

- OneDrive workspace = node_modules sync churn; watch for weird fs flakiness; clean reinstall fixes (`rm node_modules, package-lock.json; npm install`).
- npm 10 arborist bug: do NOT install vitest@4 (crashes); vitest 3→5 jump is fine.
- PowerShell-written JSON needs the no-BOM write (see errors.md).

## Next concrete steps

1. **WEEK-01** starts next session: read `weeks/WEEK-01.md` → provider completeness (structuredOutput/embeddings + capability negotiation), SecretStore (Windows Credential Manager first), routing API + health command.
2. User items when convenient: product name (Jarvis vs GitSwipe), GitHub OAuth creds, BYOK test keys in local `.env`.

## Docs health

All docs written and current; ADRs 0001–0004; ssoc git-work pattern locked (PROJECT-CORE #18/19, REPO-WORK-CONVENTIONS.md).
