# Architecture Decision Records (Phase 0 proposals)

The product repo already has accepted decisions DEC-001..DEC-020 in `saturoom/docs/DECISIONS.md`. Those stay **Confirmed** (the owner approved them). The records below are **Recommended** reconciliations between that repo and this pack. None is Confirmed until you approve it. Nothing here changes code.

Status labels: CONFIRMED / RECOMMENDED / OPEN QUESTION.

## ADR-P0-01 Keep the existing stack and repository (RECOMMENDED)

- **Problem:** the pack assumed a possibly empty repo and listed a stack to evaluate.
- **Options:** (a) keep `saturoom/` as is; (b) restart from the pack structure; (c) split into separate repos.
- **Recommend:** (a). Next.js 16 + NestJS 12 + Prisma + Postgres 17 monorepo already matches the pack's candidate stack, passes typecheck, lint and 394 unit tests (Verified), and encodes owner-approved decisions.
- **Trade-offs:** inherits some scope (F&B, mahjong) the pack wants deferred; Next 16/Nest 12/Prisma 7/TypeScript 6 are very new, so fewer community answers and more breakage risk.
- **Risk:** low if we do not rewrite. High if we restart: lose 24 commits of tested RLS and auth work.
- **Validate:** clean-clone `pnpm install --frozen-lockfile && pnpm build` (repo documents this passed; re-run it in Phase 2).
- **Revisit if:** the DB-backed suite cannot be made green on a fresh machine.

## ADR-P0-02 One product app, one API, separate marketing site (RECOMMENDED)

- **Problem:** pack wants `apps/marketing` and `apps/bola` separate; repo has one `apps/web` for all categories.
- **Options:** (a) keep one product web app, category-specific areas inside (`/akademi`, `/fnb`, `/mahjong`), add `apps/marketing`; (b) create `apps/bola` and move academy pages; (c) one app serving both public and private.
- **Recommend:** (a). The shared identity, tenant switcher, team, branches, dashboard and audit are used by every category; a per-category app would duplicate or force a shared package early. The only boundary that really matters is public vs authenticated, because they differ in caching, SEO, security headers, release cadence and risk. (c) is rejected: it is what the pack warns against.
- **Domain angle:** if you still want `bola.saturoom.com`, it can be a hostname that serves the same product app, with the tenant's category from the database (never from the hostname). That keeps one deploy artifact. See ADR-P0-03.
- **Trade-offs:** the product app carries code for categories that may be frozen; mitigated by module entitlements already in the registry (server-side).
- **Risk:** category sprawl in one app; keep per-category code inside its folder and its API module.
- **Validate:** marketing app builds and deploys without touching the product app; product app has no public marketing routes.
- **Revisit if:** a second industry needs a different shell, or team size grows to need independent release trains.

## ADR-P0-03 Domain and session topology (OPEN QUESTION, recommendation given)

- **Problem:** three proposals exist (PRD: `app.` + `api.`; pack: `bola.`; repo: single origin with internal API).
- **Options:**
  1. `saturoom.com` marketing; `bola.saturoom.com` product web; API only reachable internally via the web app's same-origin proxy (current DEC-015 design). Cookie is host-only (`__Host-sr_session`), so no cross-subdomain sharing.
  2. `app.saturoom.com` + public `api.saturoom.com`: needs cross-origin cookies/CORS/CSRF changes and exposes the API to the internet.
  3. Wildcard cookie on `.saturoom.com`: rejected for now; widens blast radius (any subdomain, including a future compromised one, could read or set it).
- **Recommend:** option 1. It already works in the rehearsed stack, keeps the API off the internet, and `__Host-` cookies are the strongest default. A future second product gets its own host and goes through an explicit SSO design, not a shared cookie.
- **Consequence:** login lives on `bola.saturoom.com`; the marketing site only links to it. A user with accounts on two future products would sign in on each until SSO is designed. Acceptable because only one product is in scope.
- **Needs from you:** confirm hostname (`bola.` vs `app.`) and whether `bola.` should be the generic app host or football-only (Q2).

## ADR-P0-04 Modular monolith stays (CONFIRMED by DEC-001; restated)

No microservices, event bus or second database. API modules: auth, tenancy, business, audit, academy, fnb, mahjong, features, health, mail. Rule: a category module may depend on platform modules, never the reverse and never on another category.

## ADR-P0-05 Role model: keep four system roles, treat coach as an assignment (RECOMMENDED)

- **Problem:** pack lists Owner, Manager, Head Coach, Coach, Parent. Code has `owner`, `manager`, `staff`, `readonly` (multi-role per membership, DEC-007) and training sessions can name a coach (membership) optionally.
- **Options:** (a) keep four roles, a "coach" is a staff member assigned to sessions; (b) add `head_coach` and `coach` system roles with team-scoped permissions; (c) custom roles per tenant (already deferred in DEC-013).
- **Recommend:** (a) until pilot evidence shows coaches need to be restricted to their own groups. The real gap is scoping: today `staff` sees all players in the branch scope, not only their groups. That is a **data-minimization question for children's data**, not just UX (Q4).
- **Risk:** if coach-to-group scoping is required, it needs a new permission scope and RLS/policy tests; plan it as its own slice.
- **Validate:** ask pilot academies how coaches work (see `09_RESEARCH_AND_VALIDATION.md`).

## ADR-P0-06 Guardians and parent portal: not now (RECOMMENDED)

Keep guardian contact as gated fields (DEC-019). A portal needs external identities outside business membership, a new access model, and consent/retention rules. All three are undecided. Do not build until Q6 and the child-data policy are answered.

## ADR-P0-07 Freeze F&B and mahjong; do not remove (RECOMMENDED, needs your answer to Q1)

- **Problem:** pack and your prompt say F&B is future, but code exists and was owner-approved (DEC-020).
- **Options:** (a) freeze: keep code and tests, stop new work, hide from marketing and from category choice at sign-up; (b) remove from main and park on a branch; (c) continue as a parallel product.
- **Recommend:** (a). Removal destroys tested work, continuation splits focus before the first customer. Hiding is a small, reversible change (the registry already has `available`/`planned`).
- **Risk:** frozen code still gets security patches and dependency upgrades; the test suite still runs on every change.
- **Revisit when:** the academy pilot has run, or a paying F&B/mahjong prospect appears.

## ADR-P0-08 Instruction sources (RECOMMENDED)

One working-instructions source per repo: this pack's `CLAUDE.md` merged with the repo's `AGENTS.md` rules (Next 16 warning, pnpm, ESM imports with `.js`, RLS table rule, route-inventory test). Archive the older PromptPack and StarterKit under `docs/archive/` rather than deleting them, so history is kept.

## ADR-P0-09 Deployment: one VPS host with Docker Compose + Caddy (RECOMMENDED, pending VPS audit)

Matches the rehearsed stack. Separate staging from production (a second compose project or second host), off-host encrypted backups, and a tested restore before real data. Final choice waits on the read-only VPS audit.

---
## Correction (2026-10-25, after reading every file in `saturoom/docs`)
- **ADR-P0-07 premise was wrong.** F&B and mahjong are not scope drift: PRD v0.1 §11 phase 3 says "one pilot category end-to-end; the other two built with the same domain boundaries", and DEC-020 (owner-approved) ordered them. The only conflict is with this newer pack, which calls F&B future scope. Recommendation now: keep them as built; whether to show them on the marketing site is a separate decision.
- **ADR-P0-03:** every older document (PRD §7.1, StarterKit `ARCHITECTURE.md`) uses `app.saturoom.com` for the app; only this pack uses `bola.`. `api.saturoom.com` is unnecessary because DEC-015 keeps the API internal. Working default: `app.saturoom.com`, pending the owner.
- **Roadmap position:** the repo follows PromptPack Gates 0-7. Gates 0-5 are done, prompt 08 (release readiness) has been assessed, so the project is at **Gate 6, pilot hardening**, not Phase 0.
