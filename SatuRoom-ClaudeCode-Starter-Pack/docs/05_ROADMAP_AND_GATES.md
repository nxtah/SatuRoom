# Roadmap and Quality Gates

Web-first; football academy is first operational product; marketing is a separate surface. Native mobile is deferred and excluded from current work.

## Phase 0 — Discover/map (NO PRODUCT CODING)
Audit repo/environment; synthesize confirmed/proposed/open requirements; map journeys; review assets; evaluate architecture/security/data; review skills; produce phased plan. **Gate:** owner approves plan and MVP.

## Phase 1 — Product definition and UX
Finalize MVP/exclusions, flows, permission matrix, information architecture, design system, screen states, prototype/specs, usability-test plan. **Gate:** owner approves workflows and visual direction.

## Phase 2 — Engineering foundation
Local setup, config, migrations, API docs, auth, business/membership/authorization foundation, tenant isolation, tests/CI, deployment plan based on audit. **Gate:** security and isolation tests pass.

## Phase 3 — First vertical slice
Candidate (confirm first): academy profile → team → player. Implement UI/API/database/validation/permissions/tests/states. **Gate:** acceptance criteria and role/isolation tests pass.

## Phase 4 — Core academy workflows
Prioritize validated needs; candidates: staff setup, player records, squads, training schedule, attendance. Billing, parent portal, development notes require explicit approval. One vertical slice at a time.

## Phase 5 — Marketing site/integration
Separate deployment, truthful content, secure route/auth behavior, domains/TLS/SEO/privacy as appropriate. **Gate:** content and deployment reviewed.

## Phase 6 — Web hardening and pilot
Security, accessibility, responsiveness, performance, backups/restore, rollback, production-readiness, real-user pilot and issue triage. Production deployment requires explicit owner approval.

## Deferred future phase — Native mobile
Not scheduled. Revisit only after web validation and explicit authorization. No native mobile code or pipelines now.

## Done means
Acceptance criteria met; tests actually run; no unexplained errors; relevant states/accessibility/responsiveness handled; docs updated; evidence and risks reported.
