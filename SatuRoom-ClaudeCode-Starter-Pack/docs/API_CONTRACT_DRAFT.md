# API Contract Draft (documents the API that exists)

Source: controller decorators in `saturoom/apps/api/src` (Verified by reading, 2026-10-25). Not generated from OpenAPI; the repo says OpenAPI is served at `/api/docs` outside production (Documented, not opened by me). Prefix `/api/v1`. All paths below are relative to it.

## Conventions (Documented in DEC-010/011/014/015, `docs/TENANCY_DESIGN.md`)
- Auth: cookie session (`__Host-sr_session` in production, `sr_session` on plain HTTP). Token hash only in DB.
- CSRF: SameSite=Lax + required header `x-saturoom-client: web` on state-changing requests + `Origin` check. Missing header: 403.
- Tenant: derived server-side from `Session.activeMembershipId` on every request. No tenant ID is accepted from client as authority. No active membership: 403 `TENANT_CONTEXT_REQUIRED`.
- Authorization: every handler declares `@RequirePermission(...)`, `@Public()`, or is on an approved "login only" list; enforced by `route-inventory.int-spec.ts`.
- Validation: zod schemas from `packages/contracts`; strict objects reject unknown fields (`tenantId`, `branchId`, `status`).
- Errors: stable `code` field passed to client; other tenant's resources return the same 404 as missing ones; oversized body 413 `PAYLOAD_TOO_LARGE`; malformed JSON 400 generic.
- Caching: `Cache-Control: no-store` on all `/api/v1`.
- Pagination: cursor (`after=<id>`), cross-tenant cursor yields empty list.
- Money: integer rupiah, computed on server (DEC-020).
- Rate limits: in-memory, per IP for auth, per user for session routes.

## Route inventory (by area)

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `/auth/verify-email`, `/auth/verify-email/resend`, `/auth/login`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset`; `GET /me` |
| Tenancy | `POST /tenants`, `GET /tenant`, `GET /me/memberships`, `POST /auth/active-tenant` |
| Members | `GET /members`, `PATCH /members/:id/roles`, `PATCH /members/:id/branches`, `DELETE /members/:id`; `GET/POST /invitations`, `DELETE /invitations/:id`, `POST /invitations/accept` |
| Business | `GET/PATCH /tenant/profile`, `GET /onboarding`, `POST /onboarding/complete`, `GET/POST /branches`, `PATCH /branches/:id`, `GET /modules`, `POST /modules/:id/enable|disable`, `GET /dashboard`, `PUT/DELETE /dashboard/layout` |
| Audit | `GET /audit-events` (permission `audit.read`, owner by default) |
| Academy | `GET/POST /academy/players`, `GET/PATCH /academy/players/:id`, `GET/POST /academy/groups`, `GET/PATCH /academy/groups/:id`, `PUT /academy/groups/:id/players`, `GET /academy/coaches`, `GET/POST /academy/sessions`, `GET/PATCH /academy/sessions/:id`, `GET/PUT /academy/sessions/:id/attendance`, `GET /academy/reports/attendance` |
| Academy fees | `GET/POST /academy/fees/plans`, `PATCH .../plans/:id`, `POST .../invoices/generate`, `GET .../invoices`, `GET .../invoices/:id`, `POST .../invoices/:id/payments|waive|void`, `GET .../arrears` |
| F&B (frozen, see ADR-P0-07) | `/fnb/menu`, `categories`, `items`, `settings`, `orders` (+lines, void, pay), `report` |
| Mahjong (frozen) | `/mahjong/tables`, `settings`, `sessions` (+close, void, items, payments), `reservations` (+cancel, fulfill), `report` |

About 100 route decorators across 11 controllers.

## Gaps vs the pack's "documents to write"
1. No versioning/backward-compatibility policy written (only the `/v1` prefix).
2. Error envelope and code list exist in code but not in one document.
3. Date/timezone convention for sessions: not verified; check `academy/dates.ts` before documenting.
4. Idempotency for payments/invoice generation: not verified.
5. OpenAPI output not reviewed; whether it is complete is unknown.
6. No API surface for future non-web clients except the same cookie flow; mobile token flow is only a stated intent (DEC-006). Not built, not needed now.

## Proposed next step
Generate and commit the OpenAPI JSON in CI, and diff it on every PR so contract changes are visible. Small, reversible, no new dependency if Nest's swagger package is already used (not verified).
