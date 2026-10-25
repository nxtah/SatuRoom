---
name: saturoom-architecture-review
description: Review SatuRoom web architecture, backend modules, API contracts, repository boundaries, and future portability without building mobile.
---

Audit current stack before recommending rewrite. Keep marketing and academy app as distinct deployable surfaces. Separate shared identity/business membership/authorization from academy domain. Prefer modular monolith unless evidence supports distributed services. Document API contracts, errors, validation, pagination, auth. Keep domain rules out of UI-only code. No mobile code or tooling. Explain trade-offs, operational cost, migration path, rollback. Treat local workflow separately from VPS deployment. Record major decisions.
