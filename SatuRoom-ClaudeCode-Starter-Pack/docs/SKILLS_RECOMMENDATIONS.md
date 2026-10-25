# Skills and Tools Recommendations

Nothing was installed. Installation status of everything below: **not installed by me**. I did not browse the internet for this phase, so external sources are not verified; check current docs before installing anything (`12_SKILLS_POLICY.md`).

## Already available (Verified in this session's skill list)

| Skill | Source | Use for | Overlap / note |
|---|---|---|---|
| `saturoom-architecture-review`, `-tenant-security`, `-ux-review`, `-vertical-slice`, `-release-check` | Project-local, in this pack's `.claude/skills` | Each maps to a pack workflow. Short (about 700 bytes each), no scripts, no permissions beyond normal tools. | **They live in the pack folder, not in the product repo `saturoom/.claude`.** Copy them (after review) into the repo to make them apply there. |
| `frontend-design` | Plugin | Visual direction, typography when we design the marketing site | Use with the saturoom-ux-review rules; do not let it override the approved palette. |
| `code-review`, `security-review`, `simplify` | Built in | Diff reviews after each slice | Complement, not replace, the repo's DB isolation tests. |
| `claude-in-chrome` / browser skills | Built in | Screenshot-based UI checks | Needs the extension/desktop browser; availability on this machine not verified. |
| `investigate-first`, `surgical-patch`, `lean-build`, `verify-and-stop`, `migration`, `safe-refactor` | caveman plugin | Process discipline; `migration` fits Prisma changes, `verify-and-stop` fits readiness checks | Optional. Overlaps with the saturoom skills; use only if wanted. |

## Recommended: use now
1. Copy the five saturoom skills into the product repo after you read them. Zero cost; they encode tenant and UX rules.
2. Merge pack `CLAUDE.md` with repo `AGENTS.md` (ADR-P0-08).

## Recommended: later, if a concrete need appears
| Tool | Problem it solves | When | Risk/cost |
|---|---|---|---|
| `@axe-core/playwright` | Automated accessibility checks in existing Playwright e2e | Before pilot | New dev dependency; automated checks catch only a part of issues. |
| Playwright Firefox/WebKit projects | Browser coverage | Before pilot | CI time. Already supported by Playwright. |
| Error tracking (e.g. Sentry self-hosted or hosted) and uptime monitor | Blocker 5 in readiness doc | Phase P5 | Sends data off-host if hosted: needs a privacy decision because of child data. Do not choose before Q on retention. |
| Redis | Shared rate limit if more than one API instance | Only if scaling out | New service to run and secure. Not needed on one host. |
| Independent pen test / review | Self-review bias | Before real child data | External cost. |

## Not recommended now
Mass-installing marketplace skills, a design-system generator, a second ORM or test runner, or any plugin with broad file/network permissions. No evidence of need.

## Permission changes needed
None today. Running the DB suite will need approval for Docker commands.
