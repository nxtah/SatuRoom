# Phase 0 Prompt — Understand SatuRoom and Produce a Plan (NO PRODUCT CODING)

Read `CLAUDE.md` and all relevant docs first. Your job is to understand the project, safely audit the current environment, and create an implementation-ready plan for SatuRoom's first web product: football academy management. The marketing website is separate. Native mobile is explicitly deferred.

## Hard boundaries
- Do not implement product features yet.
- Do not create mobile app code or pipelines.
- Do not deploy to production, modify VPS configuration, or run destructive commands.
- Do not install external skills/plugins/dependencies without first recommending them and obtaining approval if installation changes the environment.
- Read-only inspection and documentation creation are allowed. Never expose secret values.
- Never claim research/tests occurred unless actually performed.

## Sequence
1. Audit repository, git status, file structure, package manager, runtime, docs, code, tests, build commands, and deployment. Identify existing vs missing; do not assume empty repo.
2. Summarize Confirmed, Proposed, and Open Question separately. Explain intended `saturoom.com` marketing site, `bola.saturoom.com` academy app, shared backend/API, future industries later, no mobile now.
3. Map provisional users (Owner, Manager/Admin, Head Coach, Coach, Parent/Guardian) and candidate journeys: setup, staff access, player/team management, schedule, attendance. Flag parent portal/child accounts as unresolved. Identify candidate smallest vertical slice and why.
4. Define UX plan using `docs/02_UX_AND_VISUAL_PRINCIPLES.md`. Inspect actual assets. If brand direction is unknown, propose 2–3 written directions and request approval before large visual implementation. Include navigation, state inventory, accessibility, responsiveness, and low-clutter approach.
5. Evaluate architecture after auditing current stack. If greenfield, assess Next.js/TypeScript, NestJS/PostgreSQL, REST/OpenAPI, modular monolith. Compare alternatives and explain trade-offs, maintenance, VPS constraints, deployment separation, auth, and API portability.
6. Draft data model, ERD, role-permission matrix, privacy risks for children/player data, and cross-business test plan. Mark unresolved fields explicitly.
7. Review existing Claude Code skills/plugins. Check current official docs and trustworthy sources if internet access is available. Recommend a small relevant set for UX, frontend, accessibility, backend, testing, security, deployment. Explain source, purpose, overlap, risk, and exact install steps. Do not silently install or claim success without verification.
8. Produce phased plan. Each phase needs goal, tasks, dependencies, deliverables, acceptance criteria, tests, risks, and approval gate. Separate local development from VPS deployment. Marketing and academy are separate workstreams. Mobile is explicitly deferred.

## Create/update these documents (merge with existing user content; do not blindly overwrite)
`docs/00_PRODUCT_BRIEF.md`, `01_PRODUCT_BOUNDARIES.md`, `02_UX_AND_VISUAL_PRINCIPLES.md`, `03_TECHNICAL_DIRECTION.md`, `04_SECURITY_AND_DATA_ISOLATION.md`, `05_ROADMAP_AND_GATES.md`, `06_DECISIONS_AND_OPEN_QUESTIONS.md`, `07_ROLE_PERMISSION_MATRIX_TEMPLATE.md`, `08_DATA_MODEL_STARTER.md`, `09_RESEARCH_AND_VALIDATION.md`, `10_DEFINITION_OF_DONE.md`, `11_DEPLOYMENT_AND_VPS_AUDIT.md`, `12_SKILLS_POLICY.md`, `13_GLOSSARY.md`, plus `docs/IMPLEMENTATION_PLAN.md`, `ARCHITECTURE_DECISION_RECORDS.md`, `REPOSITORY_AUDIT.md`, `UX_FLOWS.md`, `API_CONTRACT_DRAFT.md`, `TEST_STRATEGY.md`, and `SKILLS_RECOMMENDATIONS.md`. Adapt to existing repo; preserve useful content.

## Final report
State what was inspected, what existed, files created/updated, recommended stack/options, proposed MVP/exclusions, architecture/data isolation, UX plan, skills recommended and installation status, a short prioritized list of blocking questions, assumptions/risks, and next phase needing authorization. Stop after planning. Do not code product features until owner approves plan and MVP.
