# GitSwipe — External Repo Research

> Every external repo proposed for evaluation gets added here in the same format.
> Legend: ✅ USE (install/adopt) | ⚠️ PARTIAL (patterns/concepts only, or post-v1 optional) | 🚫 SKIP (no dependency, no adoption)
> Rule: verdicts are about GitSwipe's roadmap (weeks ladder + ADRs), not general repo quality. A great repo can still be a SKIP for us.

---

## MASTER COMPARISON TABLE

| Repo | Category | Stars | License | Verdict | Integrated Into |
|------|----------|-------|---------|---------|----------------|
| HKUDS/CLI-Anything | Agent-native CLI harnesses for GUI software | 50.7K | Apache-2.0 | ⚠️ PATTERNS + POST-V1 OPTIONAL | patterns -> agent-tooling/manifest idea; wishlist-as-discovery-source -> SUGGESTIONS.md; NO dependency, NO default workstation install |
| chaitanyagiri/munder-difflin | Agent control room over tmux-paned CLIs | 7.9K | (repo LICENSE) | ⚠️ PATTERNS (done, ADR 0008) | dual-plane + attachable-takeover ideas -> ADR 0008 addendum; no code, no dep |
| NousResearch/hermes-agent (OpenCode skill) | Coding-agent task dispatch | Active | MIT | ⚠️ PATTERN REFERENCE (locked, contract §18) | run/resume/follow-up concepts -> AgentGateway; never a runtime dep |
| semgrep/semgrep | Static analysis + autofix | 10K+ | LGPL-2.1 | ✅ USE (WEEK-11) | CI security scans (§146) + optional ExecutionGate diff-scanning capability |
| BerriAI/litellm | LLM proxy, 100+ providers | 43K+ | MIT | ✅ SUPPORTED ALREADY | our OpenAI-compatible provider speaks to it via base URL — zero work |
| patched-codes/patchwork | Agentic bug/vuln fixing | 1K+ | Apache-2.0 | ⚠️ POST-V1 ADAPTER TARGET | AgentAdapter slot (§17); SUGGESTIONS |
| All-Hands-AI/OpenHands | Open-source coding agent | major | MIT | ⚠️ POST-V1 ADAPTER TARGET | named alongside Harness; SUGGESTIONS |
| ionic-team/capacitor | HTML→APK/iOS wrapper | 15K+ | MIT | ✅ ALREADY LOCKED | WEEK-09 (PROJECT-CORE #6) |
| nextlevelbuilder/ui-ux-pro-max | Design intelligence skill | 721 | MIT | ✅ ALREADY IN USE | mandatory design pass (PROJECT-CORE #15) |
| (aws backlog bulk — ~36 repos) | multi-agent frameworks, Claude Code plugins, RN templates, feature flags, binary RE, monetization, SSO | — | — | 🚫 SKIP — ALL | different product shape ("Appy" is an app-builder agency platform, not an agent control plane); per-row reasons in the screening section below |
| stablyai/orca | Agent-fleet ADE: parallel worktrees + mobile companion + any-CLI-agent, with in-repo self-hostable relay | 84.8K | MIT | ⚠️ COMPETITOR + REFERENCE (patterns only) | relay/push-gateway security shapes → post-v1 remote-door reference; supported-agent list → adapter catalog; positioning sharpened; NO dependency, NO stack change |
| CopilotKit/OpenBot | Governed AI-coworker platform: per-bot container computers, CEL action policy (fail-closed), approvals, audit, AG-UI agent plug-in | 6.0K | MIT | ⚠️ PATTERN REFERENCE (closest security kin; different domain) | gateway-decides-and-records architecture validates §118/§74; refusal-names-the-rule + routines-auto-off patterns; AG-UI = post-v1 interop protocol candidate; NO dependency (Docker+Postgres+Intelligence shape is not ours) |
| CopilotKit/OpenDots | Persistent-agent template: Spaces docs, voice calls, Slack, human-review cards | 3.3K | MIT | 🚫 SKIP | personal-assistant workspace template; we already shipped both patterns it offers (approval cards, pause/resume); 18 commits, very early |
| Anil-matcha/open-dots | Solo "Meta Muse alternative" prototype: Next.js+FastAPI, deny-by-default gateway, SQLite | 5.4K | MIT | 🚫 SKIP (one pattern noted) | WORKSPACE_ROOT env boundary = the same shape as our workRoot decision (user gives GitSwipe a folder); otherwise narrower than our stack (no Chat Completions support), SEO-shaped project |
| CopilotKit/OpenMuse | Personal life-agent (browser/terminal/Gmail/finance) with durable task engine | 3.9K | MIT | ⚠️ TWO PATTERNS ONLY | no-hidden-retry-after-uncertain-external-write (check vs our §162 consumed-state, D3 hardening); SQL-lease crash recovery (post-v1 journal door); "Ideas with evidence" = convergent validation of Discover UX; requires CopilotKit Intelligence SaaS key — not our shape |

> Prior evaluations (munder-difflin, Hermes) were recorded in ADR 0008 + daily logs; this file becomes the single index for future repo research.

---

## AWS-PROJECT RESEARCH BACKLOG SCREENED (2026-09-24)

> The user's aws project (`C:\Users\arc\OneDrive\Desktop\aws`, product name "Appy") contains 11 research files evaluating ~45 repos for an **app-building agency platform** (prompt→app generation, white-label, monetization, APK binary analysis, feature flags). **Appy and GitSwipe are different products.** Appy builds apps for clients; GitSwipe is a local-first agent control plane that discovers GitHub work and dispatches it to coding agents. This screen applies each of Appy's evaluated repos to *GitSwipe's* roadmap — brutal verdicts follow.

### MASTER TABLE — Appy backlog vs GitSwipe

| Repo (from aws/research) | Appy's verdict | GitSwipe verdict | Reason |
|---|---|---|---|
| **semgrep/semgrep** | ✅ REFERENCE (bug-fixer) | ✅ **USE — CI security scan, WEEK-11** | Contract §146 demands security scans in CI; semgrep is the mature OSS choice for static analysis of dispatched-task diffs + our own repo. Park in WEEK-11 scope. |
| **patched-codes/patchwork** | ✅ REFERENCE (bug-fixer) | ⚠️ **PATTERN + future adapter target** | Agentic bug-fixing is domain-adjacent to our Execute plane. Post-v1: Patchwork as an AgentAdapter target (contract §17 "Other Agent Adapters") — an agent that fixes surfaced bugs end-to-end. SUGGESTIONS. |
| **All-Hands-AI/OpenHands** | (in 02-research) | ⚠️ **FUTURE ADAPTER TARGET** | A major open-source coding agent — exactly the kind of backend our AgentAdapter interface (§17/§18) exists for. Not WEEK-06 (OpenCode first, locked), but a named post-v1 adapter. SUGGESTIONS. |
| **BerriAI/litellm** | ✅ INTEGRATED (LLM proxy) | ✅ **ALREADY SUPPORTED — ZERO WORK** | Our OpenAI-compatible provider (§7.1) points at any LiteLLM endpoint via base URL. Users self-host LiteLLM → GitSwipe treats it as a generic provider. Nothing to build. |
| **ionic-team/capacitor** | ✅ REFERENCE | ✅ **ALREADY LOCKED** | WEEK-09 choice, PROJECT-CORE #6. No action. |
| **nextlevelbuilder/ui-ux-pro-max** | ✅ INTEGRATED | ✅ **ALREADY IN USE** | Our mandatory design skill (PROJECT-CORE #15). No action. |
| **safishamsi/graphify** | ✅ INTEGRATED | 🚫 SKIP for core | We have our own WEEK-04 analysis pipeline; codebase-KG is a possible post-v1 deep-analysis enhancer, not v1. |
| **Pimzino/claude-code-spec-workdown** | (in 06-comparison) | 🚫 SKIP | Spec-workflow for Claude Code; our task contracts (§16) already carry structured requirements; different agent stack. |
| **langgenius/dify · camel-ai/camel · crewAIInc/crewAI · kyegomez/swarms · agno-agi/agno · langchain-ai/langgraph · A-EVO-Lab/a-evolve · Cluster444/agentic** | ✅ various (multi-agent) | 🚫 **SKIP — ALL** | GitSwipe is NOT a multi-agent orchestrator. It is a control plane that *dispatches to* coding agents. Contract §178.20 forbids building what we don't need. Adding an agent-graph framework = monolith creep + a second thing to go wrong at 3am. |
| **obra/superpowers · garrytan/gstack · thedotmack/claude-mem · msitarzewski/agency-agents · sickn33/antigravity-awesome-skills · vercel-labs/skills · microsoft/skills · glittercowboy/get-shit-done · automazeio/ccpm · ruvnet/claude-flow · ultraworkers/claw-code · dyad-sh/dyad** | ✅ various (Claude Code workflow) | 🚫 **SKIP — ALL** | Claude Code plugin/skill ecosystem. GitSwipe does not run inside Claude Code; our agent is OpenCode behind our own gateway. Wrong stack, wrong shape. |
| **NSA/ghidra · radareorg/radare2 · frida/frida · capstone-engine/capstone · lief-project/LIEF · skylot/jadx · iBotPeaches/Apktool · androguard/androguard · pyhidra/pyhidra** | ✅ INTEGRATE (Appy's binary-analysis agent) | 🚫 **SKIP — ALL** | Appy reverse-engineers APKs/binary artifacts. GitSwipe analyzes GitHub repos as *text* (code, issues, diffs). Binary analysis enters our world only if we ever add security-audit opportunities to Project Radar (post-v1, SUGGESTIONS at most). |
| **growthbook · Unleash · Flagsmith** | ✅ REFERENCE (flags/A-B) | 🚫 SKIP | Local-first product; no server, no flag platform. If the daemon ever needs config toggles, env vars + config precedence (§116) already exist. |
| **valkey-io/valkey** | ✅ DOCKER (Appy) | 🚫 SKIP | We deliberately have no Redis-shaped dependency (ADR 0001: JSONL local-first). Adding a KV store = the "infrastructure for fashion" the contract bans. |
| **infinitered/ignite · thecodingmachine/… · ixartz/… · wataru-maeda/… · HasanSafarli/food-delivery-app** | ✅ REFERENCE (RN templates) | 🚫 SKIP | React Native is not our stack — Capacitor is locked (PROJECT-CORE #6). |
| **boxyhq/jackson** | ✅ REFERENCE (SSO) | 🚫 SKIP for v1 | v1 auth = local PAT + device tokens (ADR 0006). SSO is a post-v1 hosted concern. |
| **stripe/agent-toolkit · stripe-samples/subscription** | ✅ REFERENCE (monetization) | 🚫 SKIP for v1 | Monetization is a business-later problem; the contract ships product first. |
| **electron/electron** | ✅ REFERENCE | 🚫 SKIP | Tauri is the preferred optional shell (contract §181); electron is the heavyweight path we won't take unless Tauri fails. |
| **chenglou/pretext** | ✅ npm install | 🚫 SKIP | Text layout lib for Appy's frontend; we have no such surface. |
| **GoogleChrome/lighthouse · bamlab/flashlight** | ✅ REFERENCE (perf) | 🚫 SKIP | Perf benchmarking of *our* web UI is a WEEK-10 checklist item (Lighthouse run), not a dependency. |
| **patchwork** (dup of patched-codes above) | — | — | — |

### Deep dives — only the ones that earn it

#### semgrep/semgrep — ✅ USE (WEEK-11 CI + validation gate)

**Repo:** https://github.com/semgrep/semgrep · **Stars:** 10K+ · **License:** LGPL-2.1 (CLI usage is fine; we'd never vendor its code)
**Why GitSwipe wants it:** Contract §146 (dependency security, CI scans) + §63 (CI/CD security scans). Two uses: (1) CI step scanning our own repo; (2) optionally, the ExecutionGate can run semgrep on a dispatched task's diff as a pre-push validation gate — catches secret-laden or obviously vulnerable patches before the approval card renders. That second use is a genuine product feature: *diff scanning as part of pre-push gates* (REPO-WORK-CONVENTIONS §5). Cost: a new binary dependency on workstations that want it — must stay optional (capability flag, §108), not a hard requirement.
**Verdict:** ✅ Park in WEEK-11 scope; optional workstation capability for diff scanning.

#### patched-codes/patchwork — ⚠️ PATTERN + future adapter target

**Repo:** https://github.com/patched-codes/patchwork · **Stars:** 1K+ · **License:** Apache-2.0
**What:** An agentic framework that auto-fixes vulnerabilities/bugs in repos. Domain-adjacent to GitSwipe's Execute plane — but it IS an agent, not a control plane. Our equivalent interface slot already exists: AgentAdapter (§17).
**Verdict:** ⚠️ Post-v1 adapter target. Not a dependency, not v1 scope. SUGGESTIONS entry. If the user wants "GitSwipe dispatches to Patchwork for security-fix opportunities," that's a post-v1 feature with its own ADR.

#### All-Hands-AI/OpenHands — ⚠️ future adapter target

**What:** Major open-source coding agent (formerly OpenDevin). Exactly the backend class our AgentAdapter abstraction (§17/§18) was designed for — the contract even names "Other Agent Adapters."
**Verdict:** ⚠️ Named post-v1 adapter alongside Harness. Zero v1 action. SUGGESTIONS entry so it isn't forgotten.

#### BerriAI/litellm — ✅ already supported, zero work

**What:** LLM proxy normalizing 100+ providers behind an OpenAI-compatible API.
**Verdict:** Our `OpenAICompatibleProvider` (§7.1) with a base URL already speaks to it. A user self-hosting LiteLLM gets GitSwipe support for free. Documented one-liner in PROVIDER_GUIDE when WEEK-11 docs land. No code.

### Bottom line (brutal)

**Of ~45 repos evaluated across the aws project's research files, 2 earn GitSwipe action (semgrep: WEEK-11 park; litellm: docs one-liner), 3 earn parked SUGGESTIONS entries (patchwork, OpenHands, binary-analysis radar type), 2 were already locked/in-use (capacitor, ui-ux-pro-max), and the rest are honest SKIPS** — multi-agent frameworks, Claude Code plugin ecosystems, RN templates, feature-flag SaaS, binary RE suites, and monetization tooling that belong to a different product's shape. The discipline that matters: every future repo proposal gets one row in this file's master table + (only if it earns it) a deep dive — same as CLI-Anything got.

---

## HKUDS/CLI-Anything — ⚠️ PARTIAL: steal the patterns, refuse the dependency, one post-v1 door left open

**Repo:** https://github.com/HKUDS/CLI-Anything
**Stars:** 50,728 (created 2026-03-08 — ~6 months; explosive trend velocity)
**Forks:** 4,638 · **Issues:** 56 open · **License:** Apache-2.0 · **Language:** Python 3.10+ (Click)
**Activity:** pushed 2026-09-22 — very active · **Lab:** HKUDS (HKU Data Science — the LightRAG lab)
**Artifacts:** arXiv tech report (2606.03854) · 2,461 passing tests claimed · CLI-Hub on PyPI (`cli-anything-hub`) · ~100 harnesses in-repo (blender, gimp, qgis, obsidian, calibre, n8n, chromadb, LibreOffice…)

### What it actually is (no hype)

Two products in one monorepo (2,582 files):

1. **CLI-Hub** — a package manager (`pip install cli-anything-hub`) + registry of ready-made agent-usable CLI harnesses that wrap GUI/desktop software (Blender, GIMP, QGIS, Calibre…). Each harness exposes: probe commands before mutations, JSON output mode, stateful REPL + one-shot subcommands, undo/redo via the command pattern, TEST.md test-plan discipline, and an auto-generated SKILL.md so coding agents can discover the CLI.
2. **Harness generator** — a 7-phase SOP shipped as plugin/skill/command files for many coding agents (Claude Code, Cursor, Codex, **OpenCode** — `opencode-commands/*.md` exists, Hermes, Pi, OpenClaw…). An AI agent runs `/cli-anything ./gimp` and generates a brand-new CLI harness: analyze backend → design command groups/state/outputs → implement (Click) → plan tests → write tests → document → publish to PATH. Plus `/refine` gap-analysis loops (broad + focused) that incrementally extend coverage.

Their core thesis is sound and matches what we already believe: CLI is the correct agent↔software interface (structured, composable, self-describing, deterministic). Their HARNESS.md SOP is genuinely good engineering writing.

### Quality signals (honest read)

- **Good:** defusedxml for untrusted XML parsing, guarded SQLCipher writes with forced backups (Rekordbox), URL validation/DOM sanitization hardening (DomShell), test-plan-first discipline (TEST.md before tests), 100+ harnesses with unit+E2E coverage, contributor-review model for registry merges.
- **Caution:** 50K stars in 6 months is trend velocity, not maturity; registry harness quality is inherently uneven (community-built, unevenly reviewed); Python-only harnesses mean every installed harness drags a Python runtime into the workstation; harnesses are a *live command surface* — an agent-usable CLI is exactly the thing a policy engine must gate before an LLM gets it.
- **Security posture for us specifically:** if a GitSwipe workstation ever had CLI-Anything harnesses installed, every harness command would be an `exec` path through our ExecutionGate (§118) — currently unmatched commands default to APPROVAL_REQUIRED, so we are *already safe by default* against unknown harness binaries. Good. Keep it that way.

### Brutal verdict: what GitSwipe takes, and what it refuses

**We are a coding-agent control plane. Our dispatched agents edit *code* — OpenCode already reads/writes/runs code. CLI-Anything exists to make *non-code software* (DCC apps, GUI tools) agent-drivable. That is a different problem. Nothing in WEEK-06/07 needs it, and wiring it in now would be dependency adoption for a use case our ladder doesn't contain.**

**Taken (patterns, zero code, zero deps):**

1. **Agent-tool discoverability manifest (the one real idea for us).** Their Phase 6.5 auto-generates a SKILL.md so agents *discover* what a CLI can do. GitSwipe should do the same for its own workstation surface: `jarvisd` already has commands (pair, health, secret, github, serve…); the workstation should emit a manifest of GitSwipe-provided tools + their constraints into each worktree so a dispatched OpenCode session knows what it may use and what policy gates apply. This slots into contract §144 (agent tool authorization) and §16 (task contract) — a small, v1-compatible WEEK-06/07 wiring idea: **worktree tool manifest**.
2. **Probe-before-mutate + JSON-output discipline** for everything GitSwipe itself ever ships as a CLI (§73 structured chunks, §85 argv execution — their conventions validate ours).
3. **Refine-as-gap-analysis** is the same shape as our PR-lifecycle remediation loop (WEEK-06 G-pr) — conceptual confirmation only.

**Refused:**
- No dependency, no default workstation install, no registry bundling. Harnesses = third-party Python CLIs on the user's machine; adopting them means shipping + gating an attack surface that our contract never asked for.
- No vendoring of their generator; if a user wants their OpenCode to build CLIs, they can install the CLI-Anything skill themselves — GitSwipe's job is to gate whatever commands result, which we already do by default.

**Post-v1 door (SUGGESTIONS.md, needs user approval + ADR before anything ships):**

- **A. Discovery source:** their contributor wishlist issues ("build a CLI for X") are a natural *opportunity feed* for GitSwipe's Discover engine — swiped "CLI-anything wishlist #N" tasks dispatched to OpenCode with the CLI-Anything skill loaded. This turns their backlog into our task supply. Needs: their repo as a candidate source in `@jarvis/discovery`, a task-contract template for harness-building tasks, and a policy profile for generator agents (their SOP mutates a *lot* of disk).
- **B. Workstation capability flag:** report `cli-anything harnesses: N` in workstation health (§88) if the user installed the hub — so dispatched agents and the policy table know the extra surface exists.

### Scorecard

| Dimension | Score | Note |
|---|---|---|
| Engineering quality | 8/10 | SOP is excellent; security passes are real; test discipline is above community norm |
| Relevance to GitSwipe v1 | 3/10 | Different problem domain (GUI software vs code); nothing on the ladder needs it |
| Pattern value | 7/10 | Tool-manifest discoverability + output conventions are genuinely useful to steal |
| Dependency risk if adopted | HIGH | Live third-party command surface; Python runtime; uneven registry quality |
| License | ✅ Apache-2.0 | Compatible; irrelevant since we take no code |

**Final: ⚠️ PARTIAL — patterns absorbed (worktree tool manifest → contract §144 wiring idea; conventions noted), dependency refused, post-v1 discovery-source idea parked in SUGGESTIONS.md awaiting user approval.**

---

## stablyai/orca — ⚠️ COMPETITOR + REFERENCE ARCHITECTURE (patterns only, no dependency)

**Repo:** https://github.com/stablyai/orca · **Stars:** 84.8K · **Forks:** 5.5K · **Commits:** 12,667 · **License:** MIT · **Backing:** YC-backed, ships daily (their own words; the releases page is the real feature list)
**Stack:** Electron + React desktop (pnpm monorepo) · React Native mobile companion (iOS App Store + sideloaded Android APK 0.0.52; fastlane, FCM/APNs) · self-hostable cloud relay (`cloud/`, independent pnpm workspace, GCE/Cloud Run/Cloud SQL + Terraform, 25 gated deploy workflows)
**Researched:** 2026-10-04 · **Depth:** README + full repo tree + `cloud/README.md` (relay + push gateway) + `mobile/` structure. Their API/auth services live in a private repo (`stablyai/orca-cloud`) — the OSS repo is a partially-open product; conclusions below are scoped to what is public.

### What it actually is (no hype)

Three products in one monorepo:

1. **The ADE** — an Electron "Agent Development Environment": Ghostty-class terminal splits (WebGL), one prompt fanned across N agents each in an isolated git worktree, embedded Chromium with Design Mode (click a UI element → HTML/CSS/screenshot into the agent prompt), VS Code-style editing, drag-files-to-agent, annotate AI diffs and ship comments back, SSH worktrees on remote boxes, Computer Use, GitHub + Linear browsing with "open a worktree from any task". Works with **any CLI agent** — 30+ named (Claude Code, Codex, Cursor CLI, Copilot CLI, Grok, Muse, Amp, Devin CLI, Goose, Cline, Qwen Code, **OpenCode**, Hermes, …).
2. **Mobile companion** — React Native app: monitor and steer agents from the phone, push notifications when an agent finishes, follow-ups from anywhere. Pairs to the desktop through the relay, not the LAN.
3. **The relay** (`cloud/`) — the piece that matters to us. Phones and desktops **never talk to each other directly**: each opens an *outbound* WebSocket to a relay cell; a director assigns hosts to cells and coordinates migrations; cells splice frames between the two sessions. Shared wire contract package (`relay-contract`: frame shapes, close codes, admission budgets, splice state machine). Separate push gateway: the **desktop** authenticates with its X25519 key (encrypted challenge → 24h session) and registers each paired phone's native push token — **phones never hold credentials**. Logging is aggregate counters only; tokens, notification bodies, host fingerprints never logged.

### Plane-by-plane overlap read (the brutal part)

| GitSwipe plane | Orca equivalent | Honest read |
|---|---|---|
| Discover (evidence-ranked swipe feed, skill graph, dedup, radar) | GitHub/Linear *browsing* — no ranking, no AI opportunity discovery, no swipe semantics | **Ours alone** |
| Decide (task contract §16, hash-bound) | none — prompt + worktree | **Ours alone** |
| Secure execution (policy below LLM, §118 gate, hash-bound approvals, broker, audit, redaction) | nothing visible — "run with your own subscription" = trust the agent | **Ours alone** |
| Execute (one task = one worktree, OpenCode adapter) | parallel worktrees, 30+ agents, SSH remotes, snapshot/restore | **Theirs, stronger today** |
| Supervise from phone (WEEK-08/09) | mobile companion shipping NOW with app-store polish + push | **Theirs — this sentence is no longer ours to pitch** |
| BYOK AI analysis plane (§7) | different thing — BYO *accounts* for agents, no analysis layer | not comparable |

**Strategic conclusion:** Orca validates the category (agent-fleet management has real, massive demand) while leaving GitSwipe's locked core untouched: it is a *cockpit for power users driving agents they already trust*. GitSwipe is a *dispatcher that decides what is worth doing (with evidence) and gates execution deterministically*. They share two primitives — worktrees and remote supervision — and nothing else. Consequence for us: **phone supervision is table stakes, not the headline.** The pitch leads with Discover → Decide → Secure-execute; the phone is where approvals happen to live.

### Quality signals (honest read)

- **Good:** the relay design is genuinely sophisticated and matches our already-locked threat model (no inbound ports, workstation connects outbound) — proven at 84.8K-star distribution. Contract-first discipline (a shared wire-contract package with close codes and admission budgets). Ops hygiene: deploy workflows inert behind repo vars, contract tests pinning Terraform surfaces, aggregate-only logging (a discipline we already enforce via redaction). Dogfooding artifacts checked into the repo (mobile session-streaming findings docs). Skills directories (`skills/`, `skill-stubs/`, `skill-guides/`) — they've adopted the agent-skills convention too.
- **Caution:** 84.8K stars with daily ships is a funded team at full velocity — we do not race them on their surface. Electron + terminal emulation + embedded Chromium + Computer Use is a heavyweight, trust-the-agent product shape; the opposite of a thin, gated, local-first dispatcher. The OSS repo is not the whole product (API/auth services private).

### What GitSwipe takes (patterns, zero code, zero deps)

1. **Relay reference architecture — the big one.** When GitSwipe's remote-access door opens (contract optional transport; post-v1; ADR required), `cloud/packages/relay-contract` is the MIT-licensed shape to study: outbound-both-sides WebSocket, session pairing, splice state machine, close codes, admission budgets. Our outbound-only rule survives intact — a relay the workstation *dials out to* is exactly the shape the contract's optional-transport door described.
2. **Push-gateway security shape.** Desktop holds the credential; X25519 encrypted challenge mints a short-lived session; per-phone push tokens registered BY THE DESKTOP, not the phone; aggregate-only logs. If we ever add remote push notifications, steal this shape wholesale.
3. **Agent adapter catalog.** Their supported-agents list is a free, vetted post-v1 AgentAdapter (§17) backlog — 30+ CLI agents with real user bases.
4. **"Agents drive the orchestrator" validation.** Their `orca` CLI (`worktree create`, `snapshot`…) is convergent evolution with our ADR 0008 dual-plane idea and the CLI-Anything tool-manifest pattern. Third independent confirmation; keep the worktree tool manifest on the WEEK-06/07 wiring list.
5. **Small:** usage/rate-limit-reset surfacing (their account switcher) — a plausible `@jarvis/providers` health addition, a few lines, post-v1 polish.

### What GitSwipe refuses

- **Their surface:** terminal emulation, IDE editor, embedded Chromium, Design Mode, Computer Use, fan-out prompt-racing (one prompt → 5 agents, merge the winner). That is a full ADE product category — fighting there means building a second product (contract §178.20). GitSwipe's supervision is an event stream + approval cards, deliberately not terminal mirroring.
- **React Native.** Capacitor is locked (PROJECT-CORE #6) and correct for our shape: we wrap an existing web UI; they built a native terminal-streaming companion. Note the boundary: if mobile supervision ever needs real-time terminal streaming, that is the moment RN-class investment would pay — it is not on our ladder.
- **Their relay as a dependency.** It is product infra wired to GCP ops. If our door opens, we build a thin own relay informed by their contract shapes.

### Scorecard

| Dimension | Score | Note |
|---|---|---|
| Engineering quality | 9/10 | Relay + contract-first + ops discipline is the best we've reviewed in this file |
| Relevance to GitSwipe v1 | 3/10 | No v1 dependency; WEEK-09/10 plans unchanged |
| Pattern value | 8/10 | Relay + push-gateway shapes are the most directly useful patterns found so far |
| Competitive pressure | 7/10 | Kills "supervise from your phone" as a headline; validates the category; leaves Discover/Decide/Secure untouched |
| License | ✅ MIT | Clean pattern study; we take no code |

**Final: ⚠️ COMPETITOR + REFERENCE ARCHITECTURE.** Patterns parked (relay shapes, push-gateway auth, adapter catalog, CLI-orchestrator validation); no dependency, no stack change; positioning sharpened — pitch Discover → Decide → Secure-execute, never "control agents from your phone." Post-v1 SUGGESTIONS entries pending user approval.

---

## CopilotKit agent-family screen + Anil-matcha/open-dots (2026-10-04)

**Researched:** 2026-10-04 · **Depth:** full READMEs of all four + tree structure. All MIT. Three of the four are one vendor's suite play: CopilotKit is building a family (OpenBot = governed computers, OpenDots = persistent-coworker template, OpenMuse = personal life-agent) on shared bets: **AG-UI** (open agent-to-UI protocol) + **CopilotKit Intelligence** (threads/memory, a separate licensed SaaS service, self-hostable with a license — *not* inside the MIT repos). Anil-matcha/open-dots is an independent solo project riding the same name wave.

### The strategic read first (brutal)

**The gate-the-agent convergence is real.** Orca (previous entry) was the trust-the-agent outlier; these three governance-shaped repos ALL run deny-by-default action gateways with approvals + audit + encrypted credentials + redacted secrets. OpenBot's pitch sentence — *"every action decided before it happens and recorded after"* — is our §118 gate + §74 audit in their words. Two consequences:

1. **Validation:** our locked security religion was not paranoia, it was prescient. The industry is converging on it.
2. **Warning:** "security gating" alone is becoming table stakes in this sub-category. GitSwipe's differentiator stack is unchanged and remains untouched by all four repos: **Discover (evidence-ranked swipe feed — nobody has it; OpenMuse's "Ideas with source evidence" is the closest, and it's for life suggestions, not GitHub work) + Decide (hash-bound task contracts — nobody has them) + thin local-first shape (no Intelligence SaaS key, no Postgres, no Docker requirement in the core loop).**

None of the four is a GitSwipe dependency candidate. They are pattern references in adjacent domains (browser/file/computer coworker agents vs our repo-work dispatch).

### Deep dive — CopilotKit/OpenBot (the one that earns it)

**Repo:** https://github.com/CopilotKit/OpenBot · **Stars:** 6.0K · **Forks:** 812 · **Commits:** 498 · **License:** MIT · **Status:** explicit alpha, "a template, not a product"

**What it is:** an open-source AI-coworker *platform* — each Bot gets its own containerized computer (own Chromium, own workspace volume, own browser profile, gVisor optional). Every browser/file/shell/MCP action routes through ONE gateway that resolves the target, evaluates policy, writes the audit row, and only then acts. Any AG-UI endpoint becomes a Bot (LangGraph, Mastra, CrewAI, Pydantic AI, ADK, hand-written). Docker Compose + PostgreSQL/pgvector + Bun + Hono; Tauri desktop + mobile dir present. 13 example coworkers are config, not code. Hard dependence on CopilotKit Intelligence for durable threads/memory.

**Where it overlaps us (honestly):** the governance layer is philosophically OUR layer — CEL policy fail-closed (deny evaluated before allow, missing policy permits nothing, broken rule refuses), approvals surface, readable audit trail, write-only encrypted credentials, secrets never in the transcript (records a secret was requested + length, not content), loopback binding by default. If GitSwipe ever added browser-automation tasks, OpenBot is what that would look like.

**Where it does NOT overlap:** no discovery plane, no GitHub opportunity ranking, no task contracts, no worktree-per-issue model, no coding-agent dispatch. Its agents are browser/file coworkers; ours edit code in git worktrees. Its stack is deliberately heavy (per-bot containers + Postgres); ours is deliberately thin (JSONL local-first, ADR 0001). Its SaaS-shaped core (Intelligence key required) is the opposite of our self-contained daemon.

**Patterns taken (no code, no deps):**

1. **"Every refusal carries the rule that caused it."** Our gate audit records policy-version and refusal reasons; parity confirmed — keep it, and make the refusal-rule visible in the approval/audit UI when WEEK-10 hardening polishes the web screens.
2. **Routines safety rails:** 15-minute floor, cap of 20 enabled routines, ten consecutive failures auto-switch a routine off rather than burning model spend. Directly applicable to contract §119 (user-defined automation rules, post-v1): any GitSwipe automation rule needs a failure circuit-breaker + spend cap. Recorded next to the §119 SUGGESTIONS entry.
3. **Take-the-wheel UX:** when a Bot hits a login wall, it asks for help; human control is handed over in the same panel and recorded (`control_taken`/`control_released`); bot actions are *refused, not queued* while a human drives. For GitSwipe session takeover (§18/ADR 0008): when the user resumes a session via `opencode session resume`, the gateway should treat it the same way — one driver at a time, transitions recorded.
4. **AG-UI as the post-v1 interop bet:** OpenBot accepts any AG-UI endpoint as an agent. When the "gitswipe-as-CLI/interop door" (parked in SUGGESTIONS) gets built, speaking AG-UI would slot GitSwipe into the CopilotKit-family orchestrators for free. Needs ADR; note added to that SUGGESTIONS entry.

**Scorecard (OpenBot):**

| Dimension | Score | Note |
|---|---|---|
| Engineering quality | 8/10 | Fail-closed CEL policy + audit-first gateway is genuinely well thought out; alpha rough edges |
| Relevance to GitSwipe v1 | 2/10 | Different domain; zero ladder impact; 4-day plan unchanged |
| Pattern value | 7/10 | Routines circuit-breaker, take-the-wheel semantics, refusal-names-rule, AG-UI note |
| Competitive pressure | 2/10 | Not our product; only shares the (correct) security religion |
| License | ✅ MIT | Clean pattern study; no code taken |

**Final (OpenBot): ⚠️ PATTERN REFERENCE — closest security kin in the file; zero dependency; four patterns recorded; AG-UI noted as the post-v1 interop protocol candidate.**

### Short verdicts — the other three

- **CopilotKit/OpenDots — 🚫 SKIP.** Persistent-coworker template (Spaces documents, voice calls, Slack channels) built ON OpenBot's computer supervisor + Channels SDK. Both product patterns it offers that touch us — human-in-the-loop approve/decline cards and background-work pause/retry — are already shipped in our stack (approval card in the session screen; AgentGateway pause/resume). 18 commits; explicit template. Their README verification discipline (dates + fixtures-visibly-separate) mirrors our WORKING/PROTO honesty — nice confirmation, nothing to take.
- **Anil-matcha/open-dots — 🚫 SKIP (one pattern noted).** Independent solo prototype (Next.js + FastAPI + SQLite + Fernet), marketing-shaped ("alternative to OpenAI Dots, Meta Muse, Grok Bot…" topic spray, YouTube-driven). Narrower than our stack: its inference adapter does NOT implement Chat Completions (prediction/Responses only) — our OpenAI-compatible plane is strictly more capable. The one thing worth recording: **`WORKSPACE_ROOT` — "directory boundary for approved workspace actions."** This is the same design as our workRoot decision (user gives GitSwipe a folder; every approved action is confined to it). Convergent validation that the folder-boundary config is the right shape; ours is stricter (worktree-per-task on top of the root).
- **CopilotKit/OpenMuse — ⚠️ TWO PATTERNS ONLY.** Personal life-agent (Gmail, calendar, PDFs, finance, browser) on React Native + Hono + PGlite; requires a CopilotKit Intelligence key in every mode — vendor-shaped core, not our self-contained daemon. Two genuinely good engineering rules worth stealing:
  1. **"No hidden retry occurs after an uncertain external write. Review its provider outcome before creating a replacement."** This is the same religion as our §162 (approvals consumed on every terminal path; failed executions consume too) — but stated as an operational rule for *provider writes*. Action for us: **D3 hardening check — audit our `@jarvis/github` write paths (PR create, comment post): an uncertain/timeout outcome must surface to the user, never auto-retry** (a hidden retry could double-post). Small, real, on the 4-day list.
  2. **SQL leases recover interrupted work** — their crash-recovery shape. Ours is the journal + restart recovery (§33); a lease concept is a post-v1 journal enhancement door if we ever add a second daemon process. Park in SUGGESTIONS with the §33 work.
  Also: their **"Ideas — suggestions with source evidence; edit, accept, or dismiss"** surface is independent convergent validation of our Discover UX (evidence-backed cards, swipe = accept/dismiss). And their mobile choice (React Native/Expo, like Orca) again confirms our boundary: they need native browser/terminal consoles; we wrap a web UI — **Capacitor stays locked**.

### Bottom line (brutal)

Four repos, zero dependencies, zero stack changes, five patterns recorded (routines circuit-breaker for §119, take-the-wheel single-driver semantics, refusal-names-rule UI note, no-hidden-retry write rule for the D3 hardening check, SQL-lease post-v1 door), one interop protocol noted (AG-UI), one convergent validation of workRoot and of the Discover UX. The CopilotKit family is a suite play with an SaaS-shaped core; Anil-matcha is a trend-rider. **None of them discovers GitHub work, ranks it with evidence, binds it to a task contract, or dispatches it to a coding agent in a worktree. That sentence is still ours alone — and after this session, it is the ONLY sentence that matters for the demo.**

---

## Evaluation queue / template for future entries

Use the structure above: identity block (repo/stars/license/activity) → what it actually is → quality signals (honest) → brutal verdict (taken / refused / post-v1 doors) → scorecard. Research via `gh repo view` + README + tree (the backend agent-reach routes to for GitHub); record the date; never let a research doc change a locked decision — that needs an ADR.
