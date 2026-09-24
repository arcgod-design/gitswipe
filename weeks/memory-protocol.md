# weeks/memory-protocol.md — session-end protocol (anti-hallucination)

> Goal: any future session resumes from files alone. Never trust memory of a prior chat; trust the state files.
> Follow this EXACTLY at the end of every working session, before the final commit.

## 1. Update the rolling handoff

`weeks/WEEK-00.md` § "Rolling handoff" — replace its content with:

```md
## Rolling handoff (update every session)

- **Date**: <YYYY-MM-DD>
- **In-flight week**: WEEK-XX — <one-line status>
- **Stack state**: <what runs right now, exact commands>
- **Next concrete step**: <single most important next action, be specific>
- **Blockers**: <user-side items — reference USER-THING-TO-DO.md entry numbers>
```

## 2. Write the session state JSON

`weeks/state/sessions/YYYY-MM-DD.json` (append `-2`, `-3` for multiple sessions per day):

```json
{
  "date": "YYYY-MM-DD",
  "in_flight_week": "WEEK-XX",
  "week_status": "in-progress | done (exit test passed: <what>)",
  "verified": ["exact commands run and their result"],
  "files_touched": ["paths that changed materially this session"],
  "decisions_locked": ["ADR numbers + one-liners, if any"],
  "next_step": "the single next concrete action",
  "user_blockers": ["USER-THING-TO-DO.md entry numbers awaiting the user"]
}
```

Only put things in `verified` that you actually ran. If you did not run it, it is not verified.

## 3. Point current.json at it

`weeks/state/current.json`:

```json
{ "latest": "sessions/YYYY-MM-DD.json" }
```

## 4. Update the markdown ledger

- `SESSION-STATE.md` — date it "as of <date>"; stack state, verified items, pain points, next steps. This is the human-readable mirror of the JSON.
- `doc-of-journey/daily/YYYY-MM-DD.md` — what we actually did, honest, with exact commands. New file per session.
- `doc-of-journey/topics/in-progress.md` — current focus pointer.
- `doc-of-journey/topics/errors.md` — append any error that cost >5 min this session.
- `PROJECT_STATUS.md` — any capability that changed label (WORKING/PROTO/ROADMAP).
- `NEXT-TASKS.md` — tick/untick rows for the in-flight week.

## 5. Commit and push

```bash
git add -A
git commit -m "docs+state: session <date> — <one line>"
git push
```

If code changed materially, prefer splitting code and state commits. Never amend a pushed commit; add a new one.

## Anti-hallucination rules

- Never write "done" without the command output that proves it in `verified`.
- Never describe a file you did not read this session.
- If a state file and your memory disagree, the state file wins. If two state files disagree, the newer one wins and you note the conflict in the daily log.
- Anything not in these files does not exist.
