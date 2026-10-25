# Security and Data Isolation

## Identity/membership
User identity is distinct from business membership. Membership binds user + business + status + role/permissions. Every protected action verifies identity, active membership, business scope, and permission server-side. UI visibility is not authorization. Recheck reads, writes, exports, jobs, and files.

## Tenant isolation
Every business-owned record needs explicit business scope. Scope every query/mutation to authorized business. Prevent IDOR. Add tests for cross-business reads/writes. Never use obscure/predictable IDs as access control. Define membership removal and business suspension/deletion behavior.

## Auth and subdomains
Design intended login/session behavior across root and app subdomains. Do not casually share broad cookies. Review `HttpOnly`, `Secure`, `SameSite`, CSRF, expiry, rotation, logout, recovery, invitations, and revocation for selected auth approach. Do not invent cryptography or insecure password storage.

## Roles
Candidate roles only: Owner, Manager/Admin, Head Coach, Coach, Parent/Guardian. Final matrix must be approved. Least privilege by default. Parent access, if approved, is limited to explicitly linked children and allowed fields/actions. Parent portal and child logins are open decisions.

## Data protection
Minimize collection of children's personal information. Define retention/export/deletion/audit/backup. Avoid personal data in logs. Keep secrets out of source and frontend bundles. Protect backups and test restoration. Establish incident response/access revocation before real sensitive data.

## Verification
Auth tests, per-role allow/deny tests, cross-business isolation, input validation, session/logout, dependency/config audit, and deployment review.
