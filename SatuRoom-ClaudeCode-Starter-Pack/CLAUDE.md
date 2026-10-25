# SatuRoom — Claude Code Project Instructions

## Mission
Build SatuRoom, a friendly business software ecosystem. The first operational product is a football academy web app. Build reliable software for real operators, not a flashy demo.

## Read first
Read `docs/00_PRODUCT_BRIEF.md`, `docs/01_PRODUCT_BOUNDARIES.md`, `docs/02_UX_AND_VISUAL_PRINCIPLES.md`, `docs/03_TECHNICAL_DIRECTION.md`, `docs/04_SECURITY_AND_DATA_ISOLATION.md`, `docs/05_ROADMAP_AND_GATES.md`, and `docs/06_DECISIONS_AND_OPEN_QUESTIONS.md`.

## Hard scope boundaries
1. Web first. Do not build React Native, Flutter, native iOS/Android, app-store assets, or mobile release pipelines in this phase.
2. Future portability means documented API contracts and domain logic outside UI-only code; do not overengineer for hypothetical mobile needs.
3. First operational product: football academy, intended `bola.saturoom.com`.
4. Marketing site at `saturoom.com` is distinct from the academy app and should be independently deployable.
5. F&B and other industries are future scope only. Do not invent their workflows.
6. Audit repository and server before changing architecture or deploying. Never assume the repo is empty.

## Decision discipline
- Mark statements Confirmed, Proposed, or Open Question.
- Never claim interviews, usability tests, competitor research, or validation happened without evidence.
- For unclear requirements, ask only blocking questions; document safe reversible assumptions.
- For important architecture decisions, compare options, trade-offs, cost, migration path, and rollback. Never change accepted decisions silently.
- Do not add features merely because they are common in SaaS.

## UX and visual bar
Friendly, calm, polished, clear, and usable by nontechnical people. Prefer plain language, progressive disclosure, sensible defaults, and one clear primary action per screen. Avoid clutter, excessive cards, meaningless KPI tiles, random gradients, excessive borders/icons, accidental blank sections, fake data, dead controls, and unfinished states. Every screen should answer: where am I, what can I do, what happens next? Use a consistent design system. Include loading, empty, error, success, validation, denied, and narrow-screen states as relevant. Accessibility is required. User-facing copy should initially be natural Indonesian unless approved otherwise.

## Engineering and security
- Audit before installing dependencies or changing architecture. Prefer a modular monolith unless evidence justifies more complexity.
- Backend is source of truth for authentication, authorization, tenant/business scope, validation, and business rules. Hidden frontend controls are not access control.
- Scope every tenant-owned read/write/export server-side. A business ID or subdomain is never proof of authorization.
- Use migrations, typed contracts, tests, intentional error handling, and `.env.example` placeholders. Never commit or print secrets.
- Do not print secret values from environment files; report variable names and configured/missing status only.
- Do not run destructive commands or deploy to production without explicit approval.
- Do not fabricate test results or claim checks passed unless actually run.

## Workflow
Inspect → summarize findings/risks → plan → implement small vertical slice → test → inspect UI when possible → update docs/decision log → report exact changes, verification, gaps, and risks.

## Definition of done
Acceptance criteria met; appropriate tests actually run; no unexplained runtime/console errors; responsive/accessibility and relevant states handled; docs/config updated; risks disclosed.
