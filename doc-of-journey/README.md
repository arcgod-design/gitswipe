# doc-of-journey

Informal build log for **GitSwipe** (internal codename **Jarvis** — package names + wire protocol use it). Modeled on the Astro/lattice `doc-of-journey` pattern. Written as we go — honest, detailed, "future-us at 3am" readable.

## Structure

```text
doc-of-journey/
├── README.md            # this file
├── daily/               # one file per working session, YYYY-MM-DD.md
├── decisions/           # one file per locked decision, NNNN-title.md (this is the ARCHITECTURE_DECISIONS set, contract §101)
└── topics/              # cross-day references (append-only, never delete)
    ├── errors.md        # every error that took >5 min to diagnose + fix
    ├── tactics.md       # what worked (reusable tricks)
    └── in-progress.md   # current focus, pointer for the next session
```

## Rules

- Start of each working session → new daily file.
- Known gaps, recorded honestly: sessions 7–9 (mvp demo build: M1 demo server, M2 mock agent + ADR 0008, M3 demo UI) were logged on the `mvp` branch — their daily files live there, not here. Session 11 (WEEK-06 deterministic core) landed on dev but its daily file was never written; the machine-readable record survives in `weeks/state/sessions/2026-09-24-11.json`. Do not backfill from memory — the state files are the primary record.
- Lock a decision → new numbered file in `decisions/`.
- Error costing >5 min → append to `topics/errors.md`.
- Trick that saved time → append to `topics/tactics.md`.
- Product decisions live UPSTREAM in `PROJECT-CORE.md` / `docs/VISION.md`; this layer records the journey, not the spec.
- Session-end protocol → `weeks/memory-protocol.md`.

## Tone

Conversational. Specific beats polished. Exact commands, file paths, test counts — no hand-wave.
