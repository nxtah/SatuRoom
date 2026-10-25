# SatuRoom — Claude Code Starter Pack
Version 0.1.0 | Planning-first | Web-first

## Start here
1. Read `CLAUDE.md`.
2. Read the product, UX, architecture, security, roadmap, and decisions docs.
3. Run `prompts/PHASE_0_DISCOVERY_AND_PLAN.md` in Claude Code.
4. Review the plan and approve MVP scope before implementation.
5. Use later phase prompts only after approval.

## Scope guardrails
- Build web experiences first. First operational product: football academy at intended `bola.saturoom.com`.
- Marketing website at intended `saturoom.com` is a distinct product surface and independently deployable.
- Shared backend/API may provide identity, businesses, memberships, roles, permissions, and common services.
- No native mobile app implementation now. Keep API/domain boundaries portable, but do not build mobile code or pipelines.
- VPS and domain are owned; provider, OS, DNS, server state, credentials, and deployment topology are unknown until audited. Local development should run on the laptop.
- Never expose secrets, overwrite existing data, or make destructive server changes without explicit approval.

## Status labels
**Confirmed** = owner explicitly agreed. **Proposed** = recommendation to validate. **Open question** = never silently decide as fact.
