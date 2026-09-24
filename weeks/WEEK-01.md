# WEEK-01 — Provider completeness: all adapters, model routing, OS credential store

> Exit test: provider suite green including timeout/429/auth-failure/malformed-stream mocks; a BYOK key round-trips through the OS credential store (write → read → use → never appears in any log or journal file); routing resolves per task type with user overrides.

## Scope

- Finish every adapter in `@jarvis/providers`: structured output paths with capability negotiation (contract §141/§142), embeddings interface (where provider supports), usage/cost metadata capture (§51).
- BYOK secret storage: OS credential store on the workstation (Windows Credential Manager / macOS Keychain / libsecret) behind a `SecretStore` interface; `.env` keys are dev-only fallback, flagged in logs as dev mode (contract §7.3).
- Model routing UI-shape: route keys (discoveryQuickRank, repositoryAnalysis, promptGeneration, embeddings, securityReview) + user overrides (contract §7.2) — API surface + tests.
- Provider health: structured HealthStatus everywhere; a health-check command in the daemon CLI.
- Fallback behavior: provider failure → retry/failover ONLY within user-authorized providers (contract §110, §142).

## Notes

- No provider gets special-cased in domain code. Everything goes through `AIProvider`.
- Never log key material; redaction utilities land WEEK-07 but the rule starts NOW.
