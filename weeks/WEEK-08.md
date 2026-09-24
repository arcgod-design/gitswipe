# WEEK-08 — Web UI: full localhost experience (taste-skill pass), Puter optional auth

> Exit test: discover → swipe → task contract → session supervision → approval flows all work in the browser against the live daemon; the ui-ux-pro-max + taste-skill design checklist passes; Puter auth works as an OPTIONAL path while local mode works without any Puter dependency.

## Scope

- **Mandatory design workflow (user directive, locked PROJECT-CORE #15): ui-ux-pro-max design-system workflow FIRST, then the taste-skill pack for look-and-feel (design-taste-frontend / gpt-taste / high-end-visual-design / minimalist-ui / industrial-brutalist-ui as fits). No UI code before the design pass.**
- Screens per contract §35/§36/§174: Home/For You, Discover (swipe cards, evidence, why-this/why-not), Work (tasks/agents/approvals/activity), Projects (radar), References, Workstations, Settings (AI providers/BYOK, GitHub, security, notifications, privacy).
- Agent session screen: overview/events/terminal/diff/tests tabs + follow-up/pause/take-over/stop controls (§35.2, §80); terminal chunks structured + redacted (§73); large diffs paginated (§197).
- Event replay client: reconnect → cursor replay → snapshot on gap (§21, §120/§121).
- BYOK settings UX per contract §7.4: provider list, test/edit/remove, masked secrets (§7.3/§7.4).
- Puter integration (client-side puter.js): optional auth + state + AI per current official docs (§6, verify docs.at build time); PuterProvider bridge (PROTO since WEEK-00) becomes WORKING here. Core flows must never require it.
- Accessibility: keyboard nav, labels, contrast, touch targets, reduced motion; swipe has button alternatives (§185). i18n-ready string structure (§186).
- Web security: CSP, no dangerous inline script, origin validation (§150).

## Notes

- The web app is the ONLY UI codebase — Android (WEEK-09) wraps it via Capacitor.
