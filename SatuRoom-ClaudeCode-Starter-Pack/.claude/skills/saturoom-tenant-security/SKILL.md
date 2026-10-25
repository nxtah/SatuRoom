---
name: saturoom-tenant-security
description: Review authentication, authorization, business membership, roles, and cross-business data isolation in SatuRoom.
---

Read security doc and approved permission matrix. Verify each protected read/write/export against authenticated user, active membership, business scope, and permission server-side. Treat subdomain/business ID as untrusted context. Look for IDOR, unscoped queries, privilege escalation, unsafe invitation acceptance, and parent-child access leaks. Recommend allow/deny tests by role and cross-business. Avoid logging secrets/personal data. Report severity, exploit path, fix, regression test. Frontend checks alone are insufficient.
