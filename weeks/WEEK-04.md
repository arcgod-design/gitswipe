# WEEK-04 — AI opportunity engine: analysis, evidence, dedup, Reference mode, radar

> Exit test: an AI finding carries evidence + confidence + a duplicate-check trail; known/closed/similar issues are correctly deduped; a Reference recommendation states why it's relevant; nothing claims certain uniqueness.

## Scope

- Repository analysis pipeline: code, tests, docs, TODO/FIXME, deps, CI config, commit history (contract §10) — context packing only what's needed (§82), incremental via repo fingerprint keyed to revision (§66).
- Finding model: evidence[] with code locations, confidence, analysis_model/version stamps (§10.2, §124, §171).
- Candidate validation pipeline: open/closed issue search, PR search, discussions, related commits, semantic duplicate check = lexical + metadata + embeddings, never embeddings alone (§10.3, §11).
- Quality gates: the §168 checklist before anything is shown as bug-like; weak evidence → hypothesis label.
- Revalidation before work: cited code still exists, issue still open (§10.4, §57).
- Reference mode: separate WORK vs REFERENCE feeds; every reference carries an explicit reason (§12, §169); license metadata surfaced (§92).
- Project radar foundations: registered projects, radar item types (dependency advisories, missing tests, stale TODOs) (§13), separate from the global feed.
- Privacy modes: cloud-assisted vs workstation-local analysis; provider consent honored — never silently upload private code (§46, §67).

## Notes

- Reuse-provider routing: cheap model for quick ranking, strong model for deep analysis (contract §7.2).
- Prompt-injection fixtures from repo content start appearing here (defense tested in WEEK-10, but the untrusted-content framing is in every analysis prompt NOW, contract §50).
