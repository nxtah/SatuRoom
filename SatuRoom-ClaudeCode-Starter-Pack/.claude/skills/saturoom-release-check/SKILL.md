---
name: saturoom-release-check
description: Prepare a SatuRoom web release/VPS deployment plan and review readiness and rollback. Never deploy without approval.
---

Read deployment docs and inspect environment safely. Confirm target, version, required variable names/configuration status only, migrations, health checks, dependencies. Review tests/build/security and known issues. Confirm backup/restore/rollback. Verify DNS/TLS only from evidence. Identify irreversible steps and request approval. Never print secrets, delete data, or deploy to production without approval. Report exact verification; say clearly if deployment was not performed.
