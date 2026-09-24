# ADR 0001 — Greenfield stack + monorepo tooling

Date: 2026-09-24
Status: LOCKED

## Context

No implementation exists; the contract (§181) gives greenfield defaults. Toolchain must be boring, cross-platform, and let any package import any other without a build step during dev.

## Decision

- **Monorepo**: npm workspaces (node 22, npm 10 installed on this machine; no new tooling). Packages: `protocol`, `policy`, `providers` (+ `agents` WEEK-06); apps: `daemon`, `web` (WEEK-08).
- **Dev imports without builds**: each internal package exposes `main: src/index.ts` (TS source directly). No tsc build during dev; packaging builds come WEEK-11 (bun-compile vs pkg decision deferred to an ADR then).
- **TypeScript**: strict + `noUncheckedIndexedAccess`, ES2022, NodeNext modules, shared base tsconfig.
- **Validation**: zod v3 at every external boundary (contract §189 — GitHub payloads, event payloads, task contracts, policy rules, provider config).
- **Tests**: vitest at the root, per-package test/ dirs. One runnable check for non-trivial logic (ponytail rule); contract §62 layers arrive with their weeks.
- **Run scripts**: tsx for TS execution in dev (daemon CLI).

## Consequences

- `npm run typecheck` + `npm test` are the WEEK-00 exit commands.
- No bun/pnpm/turborepo. If CI or scale demands them later, new ADR.
