# WEEK-13 - Completion surfaces: Work, Projects, References, Activity

> Exit test: every sidebar section opens a real screen backed by real data - no 'soon' tags remain in the nav. The contract s35/s36 section list is fully live.

## Scope (the 'soon' sections the user ordered built)

- **Work** - the saved/accepted queue: right-swiped + saved candidates with their dispatch state (pending contract / dispatched / completed) - the s4.2 flow's holding area between swipe and session. Backed by the existing swipe store (s9.3) + session list joins.
- **Projects + References** - the radar/reference UIs over the BUILT WEEK-04 engines (project radar: candidates, TODO/FIXME scanner, dependabot advisories; reference mode: explicit-reason references). New: project registration flow (register a repo -> radar feed) + the two feed views (radar findings separate from the global Tinder feed, s13; references with 'useful because' reasons, s12).
- **Activity** - the journal timeline surfaced: device connects/disconnects, sessions started/completed, approvals granted, swipes - the s34 observability pane over the existing event journal (replay cursors already in the protocol).
- **Session screen tabs (s35.2)**: Overview | Events live today; add Diff (git diff of the worktree) + Tests (validation results) as real tabs; Terminal stays honest-labeled (the opencode output already streams as events).
- **Card completion (s9.2)**: the ranker's effort/difficulty/repo-health signals surfaced as card rows + the s15 'Why recommended?' explains positives AND negatives (risk rows already exist).

## Notes

- All engines for radar/references exist and are tested (WEEK-04) - this week is UI + registration flows + the joins, not new AI.