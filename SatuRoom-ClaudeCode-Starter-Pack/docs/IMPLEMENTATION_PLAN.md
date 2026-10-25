# Implementation Plan (re-based on the real repo)

Status: RECOMMENDED. Nothing below is approved. Phase numbers follow the pack (`05_ROADMAP_AND_GATES.md`), but the repo already did most of pack-Phases 2 and 3 and part of 4. The plan therefore changes the order: **validate and harden before building more.**

## Where the repo stands against the pack roadmap

| Pack phase | Status in `saturoom/` | Evidence |
|---|---|---|
| 0 Discover | This audit. | `REPOSITORY_AUDIT.md` |
| 1 Product/UX definition | Partial: PRD, design docs, tokens. No validated MVP, no usability plan, no approved role matrix for coach/parent. | docs list |
| 2 Engineering foundation | Mostly done (auth, tenancy, RLS, CI, migrations, runbook). DB suite not re-run by me. | Verified reading, Documented tests |
| 3 Vertical slice | Done for academy (players, groups, sessions, attendance, report). | Documented |
| 4 Core workflows | Academy fees/arrears done. Staff setup, onboarding present. F&B and mahjong also done (out of pack scope). | Documented |
| 5 Marketing | Not started. | Verified: no public pages |
| 6 Hardening/pilot | Not started; blockers listed in repo `RELEASE_READINESS.md`. | Documented |

## Proposed phases

### P1 — Decisions and baseline proof (small, no new features)
- **Scope:** answer the blocking questions; run the DB integration suite and Playwright e2e locally on a fresh clone and record real results; reconcile docs (one instruction source, fix stale README, archive old packs); freeze F&B/mahjong per your answer.
- **Depends on:** your answers to Q1-Q5. Approval to start local Docker Postgres and run the suite (it recreates a `_test` database).
- **Deliverables:** updated decision log, a recorded test run, merged `CLAUDE.md`.
- **Acceptance:** `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (incl. DB), and `pnpm e2e` all pass on a clean clone, with the output saved; every pack doc marked Confirmed/Recommended/Open.
- **Risks:** the Documented claims turn out stale; fix before anything else.
- **Exit:** you approve the decision log.

### P2 — Academy product definition and pilot validation (no code)
- **Scope:** pilot-academy interviews and task-based usability sessions with the current app on fictional data; decide MVP exclusions; approved role/permission matrix including coach scoping and parent question; child-data policy (retention, export, deletion, consent).
- **Depends on:** access to 3-5 owners/managers and 2-4 coaches. `six-stars-academy` may be a candidate, unconfirmed.
- **Deliverables:** anonymized notes, severity-ranked issues, approved matrix, privacy/retention policy draft, Indonesian copy review.
- **Acceptance:** each hypothesis in `UX_FLOWS.md` marked validated, refuted, or still open with evidence; MVP list signed by you.
- **Risks:** no willing participants; then the pilot scope stays a guess and we say so.
- **Exit:** approved MVP and policy.

### P3 — Pilot-blocker fixes in the app (small vertical slices)
- **Scope** (one slice at a time, each with its own acceptance criteria): changes that P2 shows are needed, such as coach-to-group scoping, privacy/terms pages, data export/deletion per policy, missing UX states found in testing.
- **Acceptance per slice:** criteria written first; server-side allow/deny tests per role; cross-business and cross-branch tests; all UI states (loading, empty, error, success, denied, narrow screen); keyboard/contrast check; migrations included; tests actually run and results reported.
- **Exit:** the pilot scope works end to end for each role.

### P4 — Marketing site (`apps/marketing`)
- **Scope:** separate app and deploy; truthful content (only available features; no F&B/mahjong unless you decide otherwise); contact/CTA to the product host; privacy and terms; SEO basics.
- **Depends on:** brand assets approval (only palette and Inter exist, from the PRD; no approved logo files found in repo), domain topology answer (Q2), P2 positioning.
- **Acceptance:** builds and deploys independently; no auth cookies shared; no private data; Lighthouse/axe results recorded when run.
- **Exit:** content reviewed by you.

### P5 — Deployment readiness and pilot
- **Scope:** read-only VPS audit, then staging with real domain, TLS, firewall, SMTP with SPF/DKIM/DMARC, secrets handling, monitoring and error tracking, automated off-host encrypted backups with a timed restore drill, RLS verified on the actual database, `TRUST_PROXY` verified on the real topology, session/token retention job, CSP with nonce, independent security review.
- **Acceptance:** every item in repo `RELEASE_READINESS.md` "Blocker" and "Before pilot" lists closed with evidence or consciously accepted by you in writing.
- **Exit:** explicit approval for production; then pilot with real users.

### P6 — Pilot learning and next product decision
Only after pilot data. F&B/mahjong, parent portal, billing integrations, AI features, mobile, SSO across products are all decided here, not before.

## Parallelism
P2 (research) and P1 (technical baseline) can run together. P4 can start once P1 Q2 and brand are answered. P5 cannot start before P3 scope is known. Mobile stays unscheduled.

## What this plan deliberately does not do
No rewrite, no repo split, no new categories, no parent portal, no payment gateway, no AI features, no mobile, no production changes.
