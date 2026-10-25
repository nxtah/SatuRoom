# Technical Direction (proposals, not blind mandates)

## First: audit
Inspect current repository, git status, package manager, runtime, tests, build scripts, deployment, VPS OS/reverse proxy, DNS/TLS, and current services. Do not assume a greenfield project or rewrite working technology without evidence.

## Candidate stack if starting from scratch
- Web: Next.js + TypeScript.
- Backend: NestJS + TypeScript, or a similarly maintainable typed backend if context favors it.
- Database: PostgreSQL.
- API: REST/OpenAPI unless requirements justify otherwise.
- Tests: unit, integration, and end-to-end at risk-appropriate layers.
- Choose one package manager and commit its lockfile.
These are recommendations, not permission to rewrite an existing stack.

## Principles
Modular monolith first; separate domain logic from UI and transport; documented API reusable by multiple web clients; shared identity/business membership separate from academy-specific modules; migrations for schema; reproducible setup; local/test-only seeds; no premature microservices, Kubernetes, event buses, or complex infrastructure without evidence.

## Candidate modules
Identity/session, businesses/memberships, invitations, authorization, academy profile/settings, staff, players/guardians, teams/squads, training sessions, attendance. Billing, notifications, player development, and parent portal require later scope approval.

## API decisions to document
Base path/versioning, authentication/session lifecycle, validation/error envelope, pagination/filtering/sorting, date/timezone conventions, rate limiting, idempotency if needed, OpenAPI generation, and backward compatibility.

## Local/VPS
Laptop is for routine local development and tests. VPS is a deployment target, not automatically the build machine. Audit before server changes. Document staging/production separation, health checks, logs, backups, restore, and rollback. Never expose secrets or deploy without approval.
