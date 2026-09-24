# WEEK-11 — Packaging + CI/CD: installers, release pipeline, complete docs

> Exit test: CI builds all artifacts from a clean checkout; a clean-machine install (Windows first, then macOS/Linux) reaches "signed in + paired + feed visible" with no manual repair; docs complete per contract §101.

## Scope

- Workstation daemon packaging: standalone Node runtime bundle or compiled executable per platform (decide + ADR: bun compile vs pkg vs plain node bundle); Windows installer, macOS .dmg/AppImage+deb paths (§37, §60) — one-click: install → sign in → pair → ready.
- Desktop shell (optional, only if it earns its weight): Tauri wrapping daemon + web UI + tray (§37); ship headless daemon regardless.
- Release workflow: versioned artifacts, checksums, signed where practical, update path with rollback (§61, §147); no unsafe in-place replace of a running executable.
- CI/CD completes: lint, format, typecheck, unit, integration, security scans, dependency audit, web build, daemon build, Android APK/AAB (§63). Release job produces artifacts; developers' machines are never the only build path.
- Docs to completion (§101–§105): README (§102, no overselling), ARCHITECTURE_DECISIONS index, SECURITY.md, CONTRIBUTING.md, DEVELOPMENT.md, DEPLOYMENT.md, PROVIDER_GUIDE.md (BYOK key never needs to reach our cloud — §103), WORKSTATION.md, AGENT_ADAPTERS.md, GITHUB_DISCOVERY.md, TROUBLESHOOTING.md, CHANGELOG.md.
- License: BLOCKED(user) — must be locked before ANY public release (PROJECT-CORE #16).

## Notes

- Supply-chain hygiene: pinned deps, lockfile audit in CI, checksums + provenance notes (§146/§147).
