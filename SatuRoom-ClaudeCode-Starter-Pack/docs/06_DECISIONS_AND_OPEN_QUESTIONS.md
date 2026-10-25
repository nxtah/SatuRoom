# Decision Log and Open Questions

## Confirmed
SatuRoom brand; intended `saturoom.com` marketing domain; football academy as first operational product at intended `bola.saturoom.com`; marketing and app are distinct; web first; no mobile implementation now; VPS/domain owned but details must be audited; friendly, visual, low-clutter UX; other industries later.

## Proposed
Next.js/TypeScript web; NestJS/PostgreSQL backend if greenfield; REST/OpenAPI; modular monolith; candidate first workflow academy setup → squad → player; candidate roles Owner, Manager/Admin, Head Coach, Coach, Parent/Guardian.

## Open questions
1. Does a repository already exist and what is its state?
2. VPS provider/OS/resources/reverse proxy/current services?
3. DNS manager and current root/subdomain/TLS state?
4. Approved logo, colors, typography, visual references?
5. Which academy workflows are essential for first pilot?
6. Is parent portal in MVP? Do parents manage child profiles without child accounts?
7. Final role permissions and who can invite/change roles?
8. Are multiple branches needed in first pilot?
9. Any essential billing/payment/accounting requirements?
10. Launch language(s), necessary player fields, and data we must not collect?
11. Existing email/SMS/WhatsApp/auth provider?
12. Backup, retention, privacy, and production-readiness expectations?

Resolve with research or owner input. Ask only blocking questions. Log each major decision with status, context, alternatives, rationale, and consequences. Never treat hypotheses as facts.

---
## Phase 0 update (2026-10-25) — original text above kept unchanged

### Answered by the audit
- Q1 repository: **exists**, `~/Documents/PROJECTS/saturoom` (git, 24 commits, Next.js 16 + NestJS 12 + Prisma + Postgres 17). See `REPOSITORY_AUDIT.md`.
- Q4 brand: only a provisional palette (orange `#FF6A00`, red `#F5222D`, charcoal `#171717`, Inter) from PRD v0.1 and repo DEC-005. No approved logo file was found. Still open for owner approval.
- Q2, Q3, Q11 (VPS, DNS, mail provider): **not verifiable from this machine**; still open.

### Confirmed (owner-approved in repo `DECISIONS.md`, restated)
DEC-001 monorepo and modular monolith; DEC-003 Postgres + Prisma; DEC-006 server-side cookie sessions; DEC-007 multi-role memberships; DEC-008 branch scope from v1; DEC-009 verified email, at least one owner; DEC-011/012 server-derived tenant context and Row-Level Security; DEC-015 same-origin API proxy; DEC-018 academy as pilot category; DEC-019 guardian contact behind its own permission; DEC-020 F&B and mahjong built after academy.

### Recommended (see `ARCHITECTURE_DECISION_RECORDS.md`)
ADR-P0-01 keep stack; -02 one product app plus separate marketing app; -03 host topology option 1; -05 four roles, coach as assignment; -06 no parent portal now; -07 freeze F&B/mahjong; -08 single instruction source; -09 one VPS, Compose + Caddy.

### Open questions that need you (grouped, blocking first)
1. **Q1 F&B/mahjong:** DEC-020 approved them and the code exists, but your Phase 0 prompt and this pack say not now. Freeze (recommended), remove, or continue?
2. **Q2 Domain topology:** `bola.saturoom.com` as football-only or generic app host? Single origin with internal API (recommended), or `app.` + public `api.`?
3. **Q3 Where do planning docs live:** this pack folder is outside the git repo. Move them into `saturoom/docs`? Which instruction file wins?
4. **Q4 Coach access:** must a coach see only their groups' players (children's data)? Today staff see the whole branch scope.
5. **Q5 Older packs** in `saturoom/docs`: archive to `docs/archive/`?
6. **Q6 Parent/guardian portal** in pilot? (Recommended: no.)
7. **Q7 Pilot:** which real academy, and can I run 3-5 interviews/usability sessions? Is `six-stars-academy` related?
8. **Q8 Child-data policy:** retention, export, deletion, consent. Required before real data.
9. **Q9 Approval to run** the DB integration suite and e2e locally (starts Docker services, recreates `_test` DB).
10. **Q10 VPS audit:** provide access method for a read-only audit, or run the commands in `11_DEPLOYMENT_AND_VPS_AUDIT.md` yourself and paste output (without secrets).
11. Existing items still open: branches needed for pilot, billing scope, language, email/WhatsApp provider, backup/privacy expectations.
