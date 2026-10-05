# answers.md — user Q&A (2026-10-04)

> Session 17 follow-up. Honest answers, no hedging. Questions quoted verbatim.

---

## 1) What is "ADR" written in SUGGESTIONS.md?

**ADR = Architecture Decision Record** — a numbered, immutable file in `doc-of-journey/decisions/` that locks an architectural decision: the context, the options considered, the decision, and its consequences.

This repo has 8 so far:

| # | Decision |
|---|---|
| 0001 | Greenfield stack lock (npm workspaces, TS strict, vitest, JSONL local-first — no DB, no Redis) |
| 0002 | Repo + license choice |
| 0003 | Safe defaults: policy + approval + session model |
| 0004 | ssoc git-work pattern (one task = one worktree) |
| 0005 | Product name: GitSwipe (internal codename Jarvis) |
| 0006 | GitHub auth: fine-grained PAT |
| 0007 | Branch model: dev/main/mvp |
| 0008 | Harness connection (our AgentGateway stays; munder-difflin ideas absorbed) |

When SUGGESTIONS.md says an idea "**Needs ADR**," it means: the idea is parked, and it can NEVER be built until (a) you approve scheduling it, and (b) the decision gets recorded as `0009-whatever.md`. The ADR is the anti-relitigation device — a future session (or a different AI model) cannot silently reverse what was locked; it must write a NEW ADR superseding the old one, with reasoning. That is how decisions survive model switches.

---

## 2) If all suggestions are approved, what changes in roadmap and weeks?

**Short answer: nothing changes in the current ladder. A promotion creates NEW post-v1 weeks, it does not touch WEEK-09..12.**

There are two different "approvals," and the distinction matters:

1. **"Approved into SUGGESTIONS.md"** (what happened with the 5 orca items): zero roadmap change. That is just the parking lot — ideas recorded so they are never forgotten.
2. **"Approved for promotion"** (not done, and not recommended now): that is when `docs/ROADMAP.md` + `NEXT-TASKS.md` + `weeks/` change in the same commit, and a new `WEEK-XX.md` with exit tests is created.

If you promoted everything today, the concrete result:

- **WEEK-09..12 stay exactly as they are** — Android, hardening, packaging, v1 acceptance. No post-v1 idea enters v1; that would delay shipping (contract §178.20: never build what we don't need yet).
- A **v2 ladder appears** (WEEK-13+): relay architecture + push gateway (needs ADR 0009), agent adapter backlog (the 30+ agent catalog), `gitswipe` interop CLI, usage surfacing, semgrep diff-gate, HarnessAdapter, Tailscale transport, etc. Roadmap gets a "v2" phase block; NEXT-TASKS gets new rows.

**My recommendation: do not promote anything until v1 ships (WEEK-12).** The competitor analysis says velocity is the threat — every week spent on post-v1 ideas before shipping is a week Orca extends their lead. The parking lot is doing its job by existing.

---

## 3) My take on making this the best and leaving competitors behind

Brutal, no hedging:

**The moat is the three planes nobody else has.** Orca (84.8K stars, funded, daily ships) validated the category — and has zero discovery intelligence, zero task contracts, zero security gating. We cannot out-velocity them on their surface (terminal/IDE/cockpit). We win on what they don't have:

1. **Make the trust boundary THE product.** GitSwipe is the only agent tool where the LLM never decides security — deterministic policy below the agent, hash-bound approvals (replay impossible by construction), brokered credentials, append-only audit. Pitch: *"the agent runs; you hold the keys; the math guarantees it."* No competitor can copy this without rebuilding their core.
2. **The swipe loop is the compounding asset.** Every swipe trains the skill graph; every ranking is explainable; every finding is evidence-backed (never naked LLM claims). Competators have browsing; we have a learning loop. Honest, evidence-backed AI vs. everyone else's vibes — that is also a trust brand.
3. **Ship v1 in 3 weeks of work (09–12). Not 12 features in v1.** Ruthless scope discipline is a competitive weapon: they iterate a cockpit daily; we ship a sharp, narrow, *safe* dispatcher. Then iterate.
4. **Interop, not war (the gitswipe-CLI door).** Orca runs any CLI agent. A post-v1 `gitswipe` CLI turns their 84.8K-star distribution into our channel — their users consume our discovery + contracts + policy inside their cockpit. Ride the biggest wave instead of paddling against it.
5. **Local-first as the privacy pitch.** Core loop runs on your machine, secrets in the OS store, no cloud dependency. That is a category-of-one for privacy-conscious devs and enterprises.
6. **Kill the real risk: the flagship loop has never touched real data.** The biggest competitive threat is not Orca — it is that discovery (our killer feature) has never run against live GitHub, because it is blocked on your PAT (U5b) and the live agent tail on your BYOK key (U5). Ten minutes of your time unblocks the exact proof that our pitch is true.

---

## 4) How will the user get remote access — laptop and mobile connected over the internet?

Layered answer — current design first, then the post-v1 doors. One fixed rule under everything (locked, contract §24): **the workstation never accepts inbound internet connections. No port forwarding, no public SSH.** Every remote option works by the workstation connecting *outward*.

**v1 (what WEEK-09 ships): local/loopback + LAN.**
- Daemon binds loopback by default. On your phone via USB dev: `adb reverse tcp:7420 tcp:7420`. On the same Wi-Fi: config (§116) can bind the LAN address — phone hits `http://<laptop-ip>:7420`, pairs with a single-use code, gets a revocable device token.
- This is deliberate: v1 supervision is "you and your laptop, plus your phone nearby." Remote-over-internet is explicitly NOT v1.

**Post-v1, two real doors (both already in contract §24 + SUGGESTIONS):**

1. **Tailscale/WireGuard transport (the lazy, safest path).** Install Tailscale on laptop + phone (5 minutes, both free). Both join your private tailnet — WireGuard-encrypted, NAT-traversed, zero inbound public ports (it dials out, which matches our threat model exactly). The phone then reaches the workstation over the tailnet as if it were the same LAN. We build almost nothing: a transport config + docs. This is the one I would ship first.

2. **Self-hosted thin relay (the Orca pattern we parked — own the whole chain).** You run a tiny relay on a cheap VPS. Laptop dials OUT to it, phone dials OUT to it, the relay pairs the two sessions (via our pairing code) and splices frames. No inbound ports anywhere on your machines. Our improvement over Orca's shape: end-to-end encrypt the frames so the relay operator (you, but still) cannot read traffic. MIT-licensed reference: `stablyai/orca cloud/packages/relay-contract`.

3. **Push notifications (the attention layer, later).** When out of home: "agent needs your approval" pings. Orca's shape, already parked in SUGGESTIONS: the DESKTOP authenticates to a push gateway (X25519 challenge, short-lived session) and registers your phone's push token — **the phone never holds a credential**.

**Concrete user journey, post-v1:** install Tailscale on both devices → open the GitSwipe app on your phone → your workstation appears via the tailnet → pair with a single-use code → supervise sessions and approve pushes from anywhere on earth. No cloud account with us, no data on anyone's servers, no open ports on your laptop.

---

*All answers consistent with PROJECT-CORE.md, contract §24, ADR 0003/0007, gitresearch.md (orca verdict), SUGGESTIONS.md. This file is a snapshot Q&A; if any decision here ever changes, the change happens in an ADR — not by editing this file.*
