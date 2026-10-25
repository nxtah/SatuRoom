# Repository Audit (Phase 0)

Audit date: 2026-10-25. Read-only. Labels: **Verified** (I ran or read it myself in this session), **Documented** (the repo's own docs claim it; I did not re-run it), **Not verified**.

## 1. Where things actually are

| Location | What it is | State |
|---|---|---|
| `~/Documents/PROJECTS/SATUROOM/SatuRoom-ClaudeCode-Starter-Pack/` | This planning pack (31 files, ~39 KB: docs, prompts, 5 local skills). | Not a git repo. Planning text only, no code. Verified. |
| `~/Documents/PROJECTS/saturoom/` | **The real product repository.** Git, branch `main`, remote `github.com/nxtah/SatuRoom`, 24 commits, working tree clean, in sync with origin. | Verified. |
| Sibling dirs `six-stars-academy`, `kolu`, `BikinSaaS` | Other projects. `six-stars-academy` is a football-academy app (different GitHub owner). | Not part of SatuRoom. Not analysed. Whether `six-stars-academy` is a prospective pilot customer or reference is an open question. |

**The pack's rule "never assume the repo is empty" matters here: it is not empty. The product is already far past Phase 0.** The pack and the repo disagree on scope; see section 6.

## 2. What the product repo contains (Verified by reading)

- Monorepo, pnpm 10.28.2 workspaces, Node 22 (`.nvmrc`): `apps/web` (Next.js 16.4.2, React 19.3, shadcn/ui, Playwright e2e), `apps/api` (NestJS 12, Prisma 7.10.1, PostgreSQL 17, zod 4, Vitest), `packages/contracts` (shared zod schemas and registry), `packages/config` (tsconfig).
- Shared platform implemented: registration, email verification, login/logout, password reset, server-side cookie sessions (hash stored in DB), tenants, branches, memberships with multiple roles, invitations, role assignment with subset-based escalation rules, audit events (append-only), module registry/entitlements, configurable dashboard, onboarding.
- Tenant isolation: layered. Guards and `@RequirePermission` (default deny), composite FKs `(tenantId, id)`, PostgreSQL Row-Level Security with a non-owner runtime role `saturoom_app`, API refuses to start if that role could bypass RLS.
- Product domains implemented (around 100 routes in 11 controllers): **academy** (players with guardian contact as fields, training groups, training sessions with weekly repeat, attendance, attendance report, fee plans, invoices, payments, arrears), **F&B** (menu, orders, payments, receipt print, sales report), **mahjong** (tables, timed sessions, billing rules, reservations, revenue report).
- 10 Prisma migrations, 897-line schema, 45 models.
- Infra: `Dockerfile`, `infra/docker-compose.yml` (local), `infra/docker-compose.prod.yml` (Caddy + web + API + Postgres, single host), `Caddyfile`, backup/restore/smoke scripts, `docs/RUNBOOK.md`, GitHub Actions CI.
- Docs in repo (1,334 lines): PRD v0.1 (PDF, 23 Oct 2026), `DECISIONS.md` (DEC-001..020, owner-approved), tenancy and academy and category designs, two self-reviews of security, release readiness, runbook, and two earlier AI packs under `docs/SatuRoom_ClaudeCode_PromptPack` and `docs/SatuRoom_ClaudeCode_StarterKit`.

## 3. What I actually ran (Verified, 2026-10-25, in `saturoom/`)

| Check | Result |
|---|---|
| `git status` | Clean, up to date with origin/main. |
| `pnpm typecheck` (contracts, api incl. `prisma generate`, web) | Passed. |
| `pnpm lint` | Passed. |
| `@saturoom/contracts` unit tests | 66/66 passed. |
| `@saturoom/web` unit tests (Vitest) | 305/305 passed (35 files). |
| `@saturoom/api` non-DB unit tests | 23/23 passed (5 files). |

Side effects: these commands regenerated gitignored artifacts (`packages/contracts/dist`, Prisma client, Next route types). `git status` was clean before; I did not re-check afterwards because these paths are gitignored.

## 4. What I did NOT run or could not verify

- **Database-backed integration suite** (repo claims 316 tests, including cross-tenant/RLS tests) and **Playwright e2e** (repo claims 13/13): not run. The SatuRoom Postgres is not running locally (the only container up is `kolu-postgres-1`, a different project). Starting Docker services and the suite recreates a `_test` database; I held off pending your approval. Their results are **Documented**, not Verified by me.
- `.env` exists locally and is gitignored (confirmed not tracked). I read variable names only. Values were not inspected or printed.
- **GitHub Actions results**: the repo's own docs say CI results were never looked at; I have no GitHub access check. Not verified.
- **VPS**: provider, OS, resources, running services, firewall, reverse proxy, DNS for `saturoom.com` and `bola.saturoom.com`, TLS, backups, SSH access. Nothing in the repo or on this laptop identifies the VPS (no SSH host config found). All of it is Not verified. See `11_DEPLOYMENT_AND_VPS_AUDIT.md`.
- UI quality, responsiveness, and accessibility: not inspected visually. No browser run done.
- Whether demo/sample data still appears in the UI: DEC-005 says early screens used labelled sample data; a grep for the label "Contoh data" in `apps/web/app` and `components` found none. Not otherwise verified.

## 5. Gaps against this pack's intent

1. **No marketing website exists.** `apps/web` is the authenticated app only. There is no public landing, pricing, FAQ, privacy policy, or terms page. (Release-readiness doc lists privacy/terms as a pilot blocker.)
2. **No `saturoom.com` / `bola.saturoom.com` anywhere in code or config.** The repo serves one origin (`SITE_ADDRESS` in Caddy) with an internal API behind a same-origin proxy (DEC-015). The PRD proposes `app.saturoom.com` and `api.saturoom.com`; this pack proposes `bola.saturoom.com`. Three different topologies are on paper; none is deployed.
3. **Role model differs.** Code has system roles `owner`, `manager`, `staff`, `readonly`. The pack's candidates (Head Coach, Coach, Parent/Guardian) do not exist. Guardians are stored as plain fields on `Player`; no guardian accounts or portal.
4. **Child-data policy missing.** Retention, export, deletion, guardian consent are undecided and the repo's own readiness doc calls this a pilot blocker.
5. **Operations gaps** (per repo docs, plausible from code layout, Not verified on a host): no monitoring or error tracking, no automated off-host backups, no RPO/RTO, rate limiter in memory, CSP only partial.
6. **Security reviews are self-reviews** by the author of the code; no independent review or pentest.

## 6. Conflicts between documents (need your ruling)

| # | Conflict | Evidence | Recommendation |
|---|---|---|---|
| C1 | Pack says F&B and other industries are future scope, build none now. Repo already implements F&B and mahjong (commits `29e125c`..`a26584f`) and DEC-020 (owner-approved) ordered them. | `docs/DECISIONS.md` DEC-020; `apps/api/src/fnb`, `apps/api/src/mahjong`; contracts registry marks them `available`. | Do not delete working code. Freeze both: no further F&B/mahjong work, and hide them from public marketing and from new-tenant category choice until you decide. Decision needed (Q1). |
| C2 | Pack: separate `apps/marketing` and `apps/bola`. Repo: one `apps/web` serving all categories by tenant category. | Repo tree; DEC-001, DEC-016. | Keep one app, add `apps/marketing` later; do not split the product app per category now (see ADR-P0-02). |
| C3 | Domains: PRD `app.` + `api.`; pack `bola.`; repo single origin. | PRD p.7; pack docs; Caddyfile. | Decide domain topology (Q2) before any deploy. |
| C4 | Pack `CLAUDE.md` says "Next.js you know"? No: repo `AGENTS.md` says Next 16 has breaking changes, read `node_modules/next/dist/docs/` first. The pack `CLAUDE.md` does not mention this. | `apps/web/AGENTS.md`. | Merge that rule into the working instructions. |
| C5 | Repo already has two older AI packs (PromptPack, StarterKit) plus this third one. Overlapping, partly contradictory instructions (e.g. PromptPack puts UI before tenancy; repo did tenancy first). | `DECISIONS.md` open item; `docs/SatuRoom_ClaudeCode_*`. | Choose one source of instructions; archive the others (Q5). |
| C6 | Your Phase 0 prompt says "Jika proyek dimulai dari nol, Next.js + NestJS bisa dievaluasi". Repo already is Next.js + NestJS + Postgres. | Verified. | Keep stack; no rewrite. |
| C7 | The earlier pack assumed no code; `README.md` of the repo still says "Status: Phase 0, no business features, auth, or RBAC". Stale. | `README.md`. | Fix the README status line (docs-only change, needs your OK since it touches the repo). |

## 7. Risks seen (Documented or Verified as noted)

- Scope drift: three categories built before any pilot customer validated even the first one. No evidence in either repo or pack of interviews or usability tests (pack `09` says none exist). Verified by absence.
- Child personal data (name, birth date, guardian phone) stored with no retention or consent policy. Documented.
- RLS never run on a managed or real host; `ENABLE` not `FORCE` RLS, protected only by startup check. Documented (R-03).
- `TRUST_PROXY` misconfiguration collapses rate limiting (R-01). Documented.
- Single-host Docker Compose deploy rehearsed only on `localhost`. Documented.
- Self-review bias on security. Documented by the repo itself.
- A plaintext-capable `.env` lives in the project directory; it is gitignored and untracked (Verified), so low risk, but worth rotating anything real before any deploy.

---
## Correction (2026-10-25)
Conflict C1 is resolved in favour of the PRD: F&B and mahjong match PRD §11 and DEC-020. See the correction note in `ARCHITECTURE_DECISION_RECORDS.md`. The audit read only the start of four design docs and none of the older packs; all of `saturoom/docs` has since been read in full (StarterKit is a byte-identical copy of `PromptPack/starter_kit`; the three PRD PDFs are identical).
