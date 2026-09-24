# doc-of-journey

Informal build log for **Jarvis**. Modeled on the Astro/lattice `doc-of-journey` pattern. Written as we go — honest, detailed, "future-us at 3am" readable.

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
- Lock a decision → new numbered file in `decisions/`.
- Error costing >5 min → append to `topics/errors.md`.
- Trick that saved time → append to `topics/tactics.md`.
- Product decisions live UPSTREAM in `PROJECT-CORE.md` / `docs/VISION.md`; this layer records the journey, not the spec.
- Session-end protocol → `weeks/memory-protocol.md`.

## Tone

Conversational. Specific beats polished. Exact commands, file paths, test counts — no hand-wave.
