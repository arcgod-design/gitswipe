# weeks/ — the ladder + the resume protocol

> If the session chats go anywhere (model switch, machine switch, days of silence), the NEXT session
> must be able to resume from these files alone, with zero hallucinations. That is this folder's only job.

## Structure

```text
weeks/
├── README.md            # this file — rules + bootstrap
├── memory-protocol.md   # what to write at session end, exact formats
├── WEEK-00.md           # foundation week + ROLLING HANDOFF LOG (always read this)
├── WEEK-01.md … 12.md   # one file per week: theme, scope, exit test
└── state/
    ├── current.json     # pointer to the newest session state file
    └── sessions/        # one JSON per working session (YYYY-MM-DD.json)
```

## How a new AI session should start (bootstrap, in order)

1. Read repo-root `CLAUDE.md` (boot map + hard rules).
2. Read `PROJECT-CORE.md` (locked decisions — do not re-debate without an ADR).
3. Read this file.
4. Read `WEEK-00.md` — the rolling handoff log at the top is "where we are right now".
5. Read `memory-protocol.md`.
6. Read `weeks/state/current.json` → the session file it points to.
7. Read repo-root `SESSION-STATE.md` + `doc-of-journey/topics/in-progress.md`.
8. Identify the in-flight `WEEK-XX.md`; read it.
9. Check `USER-THING-TO-DO.md` — if your next step is blocked on the user, say so instead of stalling silently.

Then work. At session end, follow `memory-protocol.md` exactly, commit, push.

## Rules

- One week in flight at a time. A week is DONE only when its exit test passed and `SESSION-STATE.md` records it.
- Scope changes → update the week file + `docs/ROADMAP.md` + `NEXT-TASKS.md` in the same commit.
- Anything architectural you lock → new ADR in `doc-of-journey/decisions/` the same day.
- Errors costing >5 min → `doc-of-journey/topics/errors.md` (grep it before debugging anything).
- Conventional commits. Never commit secrets. Never force-push main.
- Ponytail discipline is ALWAYS active for code: minimal diff, reuse first, stdlib first, one runnable check for non-trivial logic.
