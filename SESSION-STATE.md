# SESSION-STATE.md — as of 2026-09-24 (WEEK-01 complete)

## Current week

**WEEK-01** — ✅ **DONE.** Exit test passed in full: provider suite green including timeout/429/auth-failure/malformed-stream mocks; BYOK key round-trips through the OS credential store (DPAPI live test proves plaintext never touches disk); routing resolves per task type with user overrides and authorized-only failover.

## Stack state

- Node 22.14.0, npm 10.9.2, git 2.54. TypeScript 5.9, zod 3.25, vitest 5.0.1 (0 audit vulns), tsx 4.20.
- 75 tests / 10 files (~2s): protocol (20) + policy (22) + providers (33).
- Provider layer complete for v1 needs: chat/stream/embeddings/structured (with retry) + health + registry + router + authorized failover + typed TIMEOUT/NETWORK_FAILURE errors + resilient SSE.
- BYOK: Windows DPAPI file store WORKING (live-tested); keychain/libsecret PROTO. Key resolution: OS store > `.env` (flagged dev) > none.
- Daemon CLI: version / check / health / secret set|get|list|delete. `serve` = honest WEEK-05 placeholder.

## Verified this session (exact commands, real outputs)

- `npm run typecheck` → 4/4 workspaces clean
- `npm test` → 75/75 passed
- `npm audit` → 0 vulnerabilities
- `npm run daemon -- secret set/get/list/delete provider:openai` → stored `sk-t...7890 (dpapi-file)` masked, listed, deleted — full round-trip through real DPAPI
- `npm run daemon -- health` → `ollama FAIL fetch failed`, exit code 1 (honest failure, no ollama running); with `JARVIS_PROVIDERS=openai,ollama` → `openai FAIL HTTP 401` (no key configured — correct)

## Known pain points

- OneDrive workspace sync churn — clean reinstall fixes if fs flakiness appears.
- PS 5.1 regex passes corrupt UTF-8 — never bulk-edit non-ASCII files via PowerShell (see errors.md).
- vitest@4 crashes npm's arborist — always jump 3→5.

## Next concrete steps

1. **WEEK-02** next session: read `weeks/WEEK-02.md` → GitHub auth decision (ADR 0006: App vs OAuth vs PAT), REST client with pagination/ETag/backoff/rate-limit budget, normalized entities, JSONL candidate store, fixtures, checkIssueState revalidation.
2. User items: GitHub OAuth/App creds (U3) for the WEEK-02 live smoke; fixtures/tests need nothing.

## Docs health

All docs current; ADRs 0001–0005; WEEK-01 ledger updated (NEXT-TASKS, PROJECT_STATUS, this file, state JSONs, daily 2026-09-24-2.md).
