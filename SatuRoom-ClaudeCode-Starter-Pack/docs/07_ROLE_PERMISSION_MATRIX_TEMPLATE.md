# Role and Permission Matrix — Draft Template
Status: not approved; do not implement final authorization until owner review.

Candidate roles: Owner, Manager/Admin, Head Coach, Coach, Parent/Guardian.

| Capability | Owner | Manager/Admin | Head Coach | Coach | Parent/Guardian |
|---|---|---|---|---|---|
| View/edit business settings | TBD | TBD | TBD | TBD | No |
| Invite/remove staff | TBD | TBD | TBD | TBD | No |
| Manage roles/permissions | TBD | TBD | TBD | TBD | No |
| View player records | TBD | TBD | TBD | TBD | Linked child only if approved |
| Create/edit player records | TBD | TBD | TBD | TBD | TBD |
| Manage teams/squads | TBD | TBD | TBD | TBD | No |
| Schedule training | TBD | TBD | TBD | TBD | No |
| Record attendance | TBD | TBD | TBD | TBD | No |
| View development notes | TBD | TBD | TBD | TBD | TBD |
| Manage billing | TBD | TBD | TBD | TBD | TBD |
| Export/delete data | TBD | TBD | TBD | TBD | TBD |

Questions: unique owner/ownership transfer, multiple roles, branch/team scope, removed staff history, parent linked to multiple children/academies, parent-visible fields, data export/deletion, attendance audit. Test allowed and denied actions, including cross-business attempts.

---
## Phase 0 update: what the code does today (Verified by reading `packages/contracts/src/permissions.ts`)
Status: **implemented, "proposal pending owner approval" per the code's own comment; not approved**. Original template above is unchanged. Real system roles: Owner (`owner`), Manager (`manager`), Staff (`staff`), Read-only (`readonly`). No Head Coach, Coach or Parent roles exist.

| Capability (permission key) | Owner | Manager | Staff | Read-only |
|---|---|---|---|---|
| Business settings (`tenant.update`) | yes | no (read only) | no | no |
| Invite members (`members.invite`) | yes | yes | no | no |
| Remove members (`members.remove`) | yes | no | no | no |
| Assign roles (`roles.assign`) | yes | yes, only roles within own permissions; not `owner` | no | no |
| Branch create/update | yes | no (read) | no | no |
| Dashboard configure | yes | yes | no | no |
| Modules, billing, audit read, report export | yes | no | no | no |
| Players/attendance read | yes | yes | yes | yes |
| Players/attendance manage | yes | yes | yes | no |
| Guardian name/phone (`academy.guardians.read`) | yes | yes | no (receives null; sending fields is 403) | no |
| Fees read/manage | yes | yes | no | no |

Notes: effective permission is the union of all roles (DEC-007). Escalation rule: you may only grant a role whose permissions are a subset of yours; only owners grant `owner`; you may only reduce your own access; last owner cannot leave.  Read-only also holds `reports.read`; I re-read the full role table to confirm the matrix above.
Open: coach scoping to own groups, parent access, ownership transfer UX, export/delete permissions, attendance correction audit.
