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

## Evaluation queue / template for future entries

Use the structure above: identity block (repo/stars/license/activity) → what it actually is → quality signals (honest) → brutal verdict (taken / refused / post-v1 doors) → scorecard. Research via `gh repo view` + README + tree (the backend agent-reach routes to for GitHub); record the date; never let a research doc change a locked decision — that needs an ADR.
