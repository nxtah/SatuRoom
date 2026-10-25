# Deployment and VPS Audit

## Read-only audit first
Provider/plan; OS/version; CPU/RAM/disk and usage; running services/ports; reverse proxy; firewall; DNS root/subdomain; TLS/renewal; deployment user/permissions (never expose private keys); current projects/paths; database/backups; logs/monitoring; health checks; environment variable names/configured status only.

## Decide after audit
Separate deployments for marketing, academy, API; artifact vs container strategy; process management; database network exposure and least privilege; staging; manual vs automated release; backup/retention/encryption/restore test; rollback.

## Safety
Never delete/overwrite directories or data without approval. Never print secrets or commit them. Do not expose database publicly by default. Do not claim DNS/TLS/deployment configured without verification. Prefer reversible changes and health checks. Production deployment requires explicit approval.

---
## Phase 0 update (2026-10-25)
**VPS audit status: not performed. Nothing about the VPS is verified.** No SSH host entry or deployment config naming a server was found on this laptop or in the repo.

Repo-side readiness (Documented in `saturoom/docs/RUNBOOK.md`; not re-run): single-host Docker Compose (Caddy, web, API, Postgres), only Caddy publishes ports, API holds only the RLS-bound DB role, migrations run by a one-shot service, encrypted backup/restore scripts, smoke script. Rehearsed on `localhost` only.

Read-only commands to run on the VPS (you run them, or approve me to via SSH). They change nothing. Do not paste secrets or key material.
```
cat /etc/os-release; uname -r; nproc; free -h; df -h
systemctl list-units --type=service --state=running --no-pager
ss -tulpn
sudo ufw status verbose 2>/dev/null; sudo nft list ruleset 2>/dev/null | head -50
docker ps -a 2>/dev/null; docker compose ls 2>/dev/null
command -v nginx caddy certbot psql
ls /etc/nginx/sites-enabled /etc/caddy 2>/dev/null
crontab -l 2>/dev/null; systemctl list-timers --no-pager
```
DNS (from anywhere): `dig +short saturoom.com`, `dig +short bola.saturoom.com`, `dig +short app.saturoom.com`, `dig +short TXT saturoom.com`, and `curl -sI https://saturoom.com`. Not run by me.

Decisions that wait on this audit: staging vs production split, backup target off-host, firewall, TLS issuance method, whether the host can run RLS-capable Postgres with a dedicated role.

---
## VPS audit result (2026-10-25, read-only, Verified over SSH key `~/.ssh/saturoom_vps_ed25519`)
Supersedes the "not performed" note above.

| Item | Finding |
|---|---|
| Host | `202.10.36.167`, hostname `vps.saturoom.com`, KVM guest, provisioned 2026-10-23 (provider recipe logs in `/root`; provider likely Rumahweb, not confirmed) |
| OS | Ubuntu 24.04 LTS, kernel 6.8.0-31, unattended-upgrades active, no pending reboot flag |
| Resources | 1 vCPU, 2.2 GiB RAM, 255 MiB swap, 40 GB disk (7% used) |
| Software | Fresh: no Docker, Postgres, Node, web server, certbot, fail2ban. Only `git` |
| Listening | Only `sshd` on 22 |
| Firewall | **None**: no ufw, iptables policy ACCEPT on all chains |
| SSH | **`PermitRootLogin yes` and `PasswordAuthentication yes`**; root password was shared in chat and must be rotated |
| Users | No non-root login user |
| Existing data | `/opt`, `/srv` empty; nothing to preserve |
| DNS | NS at Rumahweb (`nsid1-4.rumahweb.*`). **No A record** for `saturoom.com`, `www`, `bola`, `app`, or `vps`. No MX, no TXT |

Implications: safe to set up from scratch (nothing to overwrite). 1 vCPU / 2.2 GiB is enough for Postgres + API + web + Caddy at pilot scale, but **building Next.js images on the host may run out of memory**; build images on the laptop or CI and push, or add swap. With one host, staging and production share hardware; recommend this VPS act as staging until a pilot needs production.

---
## VPS changes made 2026-10-25 (owner approved steps 1-3)
1. Hardening: ufw (deny incoming; allow 22, 80, 443), fail2ban sshd jail (5 tries / 10 min, ban 1 h), `/etc/ssh/sshd_config.d/00-saturoom-hardening.conf` (root key-only, password and keyboard-interactive login off). Verified: key login works, password login refused. Root password must still be rotated (it was shared in chat).
2. 2 GiB swapfile `/swapfile-saturoom` (fstab), `vm.swappiness=10`; Docker 29.9.2 + Compose v5.6.1 from Docker's apt repo; container logs capped 10 MB x 3.
3. Code at `/opt/saturoom` (git archive of commit `8f449f9`, recorded in `DEPLOYED_COMMIT`). Secrets generated on the server in `infra/prod.env` (mode 600, root only, never printed). API image built on the laptop from the same commit and loaded on the server (tags `saturoom-api` and `saturoom-migrate`). Postgres 17 container `saturoom-postgres-1`, data in volume `saturoom_pgdata`, no host port. `migrate` ran: 10 migrations, seed, `saturoom_app` login enabled.

Verified on the server: 33 tables with RLS, 40 policies, 36 permissions, system roles owner/manager/staff/readonly; `saturoom_app` is not superuser and has no BYPASSRLS; it cannot create tables; nothing listens on host port 5432. The database has no business rows yet, so "0 rows visible without tenant context" proves nothing about isolation on its own; the repo's DB integration suite is the isolation proof and has not been run against this server.

Not done yet: web, API service, and Caddy are not started (no DNS A record, no SMTP). No backup schedule yet.
