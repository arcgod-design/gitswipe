# WEEK-03 — Discovery: candidate model, feed, swipes, skill graph v0, diversity

> Exit test: a ranked feed served from fixtures; a swipe persists and measurably changes the next ranking; every card carries explainable reasons ("why this"), and rejected cards carry "why not" + show-anyway.

## Scope

- Candidate/opportunity model wired to GitHub ingestion: 8 explicit kinds (contract §9.1), never merged into one opaque type.
- Feed API: pre-fetched swipe queue (small, lazy deep analysis — contract §129), diversity constraints (language/repo/domain/difficulty, §128), staleness timestamps (§125).
- Swipe persistence + feedback vocabulary (contract §9.3): left/right/save/open_detail/work_started + why_not reasons.
- Skill graph v0: explicit skills + GitHub history + swipe signal (contract §14) — deterministic scoring first, embeddings later (WEEK-04+); presented as "learned from your activity", never objective truth.
- Hybrid ranker v0: deterministic features + user-history signals, explainable ranking records (contract §15/§173). No "objectively best" claims (§70).
- Card contract: skill match, effort estimate, difficulty, repo health, evidence counts — computed by documented scoring functions, labeled as recommendation signals (§9.2).

## Notes

- No deep AI analysis in the feed path yet — cheap metadata ranking only. Deep analysis is WEEK-04 and runs on promising candidates only (contract §45).
