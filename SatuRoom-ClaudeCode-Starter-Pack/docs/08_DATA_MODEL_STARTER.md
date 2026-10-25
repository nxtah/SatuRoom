# Data Model Starter (conceptual, not final schema)

## Shared concepts
User; Business; Membership (user/business/status/role); Invitation; Role/Permission; optional Branch/Location; AuditEvent.

## Academy candidates
AcademyProfile; StaffProfile if needed; Player; GuardianRelationship if parent access approved; Team/Squad; PlayerAssignment; TrainingSession; AttendanceRecord; optional DevelopmentNote/Assessment; later Invoice/PaymentRecord.

## Rules
Every business-owned record has explicit business scope. Define cardinality, lifecycle, uniqueness, constraints, soft/hard delete, audit needs, timezone, and indexes. Use foreign keys and constraints. Do not infer authorization from UUIDs. Minimize sensitive data. Keep business logic outside UI.

## Required deliverable
ERD, field dictionary, relationships, lifecycle notes, constraints/indexes, migration strategy, and unresolved questions before final schema implementation.

---
## Phase 0 update: actual model (Verified: `apps/api/prisma/schema.prisma`, 897 lines, 45 models)
The conceptual list above is superseded by the real schema; ERD for platform tables is in repo `docs/TENANCY_DESIGN.md` section 3.
- Platform: User, Session, AuthToken, Tenant (category ACADEMY/FNB/MAHJONG), Branch, Membership, MembershipBranch, Role, Permission, RolePermission, MembershipRole, Invitation(+Role,+Branch), AuditEvent, TenantProfile, TenantModule, DashboardConfig.
- Academy: Player, TrainingGroup, PlayerGroup, TrainingSession, Attendance, FeePlan, FeeInvoice, FeePayment.
- Frozen categories: Mahjong* (settings, table, session, item, payment, reservation), Fnb* (settings, category, menu item, order, order line, payment).
- Not present: Guardian entity (contact is two fields on Player), StaffProfile, DevelopmentNote, GuardianRelationship, Team-level coach scoping.
- Isolation: `tenantId` on every business table, composite FKs `(tenantId, id)`, RLS via `saturoom_enable_tenant_rls`, no DELETE grant to runtime role on people data.
- Still owed (pack requirement): field dictionary, ERD for academy tables, retention rules, timezone convention. Not produced in Phase 0.
