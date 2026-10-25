# Test Strategy

Labels: Verified = I ran it 2026-10-25. Documented = repo says it passes; I did not run it.

## Current test assets
| Layer | Tooling | Count | Status |
|---|---|---|---|
| Shared contracts | Vitest | 66 tests | Verified pass |
| Web logic/forms/proxy | Vitest | 305 tests, 35 files | Verified pass |
| API unit (no DB) | Vitest | 23 tests, 5 files | Verified pass |
| API integration against real Postgres as `saturoom_app` (RLS) | Vitest (`vitest.db.config.ts`) | 316 (claimed) | Documented; **not run by me** (DB not running) |
| Browser e2e | Playwright (Chromium) | 13 (claimed), 9 spec files | Documented; not run |
| Static | ESLint, TypeScript, Prettier | | lint + typecheck Verified pass; `format:check` not run |
| Security review | Self-review, manual mutation testing | | Documented |
| CI | GitHub Actions: format, lint, typecheck, test (with Postgres service), migrate on empty DB, build | | Workflow read; run results never verified |

## Gaps
1. Browser coverage: Chromium only. Firefox and WebKit untested (Safari matters for `__Host-` cookies and iOS phones used by coaches).
2. Web e2e is not in CI (repo notes this).
3. No accessibility automation (axe) found; none run.
4. No visual regression or screenshot comparison.
5. No load test; no upgrade-with-data migration test.
6. Role coverage follows the four existing roles; coach-scoped and guardian cases untestable until decided.
7. Rate limiter and sessions behave differently with more than one API instance; not tested.

## Strategy for coming work
- **Every new endpoint:** allow test per permitted role; deny test per forbidden role; no-login test; cross-business read/write/delete (must behave as not found); cross-branch test where relevant; body with `tenantId`/`branchId` ignored or rejected; invalid and oversized input. The route-inventory test must fail when a decision is missing.
- **Every new tenant table:** migration calls `saturoom_enable_tenant_rls`; RLS test as in `test/db/rls.int-spec.ts`; no DELETE grant for personal data.
- **UI slices:** component tests for states; one Playwright flow per critical journey; manual keyboard and 390 px viewport check; screenshot review when a browser tool is available. Report what was and was not checked.
- **Mutation spot checks** on security guards, as the repo already does manually; keep the practice, record results.
- **Pre-pilot:** e2e on Firefox/WebKit against staging over HTTPS; axe on key pages; restore drill on the real host; independent review.

## First action (P1 in `IMPLEMENTATION_PLAN.md`)
On a clean clone: `pnpm install --frozen-lockfile`, start local Postgres via `pnpm db:up`, migrate, seed, `pnpm test`, build, `pnpm e2e`. Save exact output. Needs your OK because it starts Docker services and recreates the `_test` database.
