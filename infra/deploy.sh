#!/usr/bin/env bash
# Deploy dari mesin lokal: build image, kirim ke VPS, terapkan migrasi, jalankan ulang aplikasi.
# Pemakaian: SATUROOM_SSH="-i ~/.ssh/kunci" SATUROOM_HOST=root@host infra/deploy.sh
set -euo pipefail
: "${SATUROOM_HOST:?isi SATUROOM_HOST, misalnya root@host}"
ssh_opts=${SATUROOM_SSH:-}
base=/opt/saturoom-platform
cd "$(dirname "$0")/.."

if [ -z "${SKIP_IMAGE:-}" ]; then
  docker build -t saturoom-app:latest .
  docker save saturoom-app:latest | gzip | ssh $ssh_opts "$SATUROOM_HOST" 'gunzip | docker load'
fi
ssh $ssh_opts "$SATUROOM_HOST" "mkdir -p $base/app"
scp $ssh_opts infra/docker-compose.prod.yml "$SATUROOM_HOST:$base/app/docker-compose.yml"
scp $ssh_opts infra/Caddyfile "$SATUROOM_HOST:$base/app/Caddyfile"
scp $ssh_opts infra/server-setup.sh "$SATUROOM_HOST:$base/app/server-setup.sh"

ssh $ssh_opts "$SATUROOM_HOST" bash -s <<REMOTE
set -euo pipefail
bash $base/app/server-setup.sh
# Migrasi memakai image yang sama; kata sandi dibaca dari file rahasia di server, tidak dicetak.
set -a; . $base/secrets/db.env; . $base/secrets/bola-db.env; . $base/secrets/fnb-db.env; . $base/secrets/mahjong-db.env; set +a
docker run --rm --network saturoom-platform \
  -e MIGRATOR_DATABASE_URL="postgresql://saturoom:\${POSTGRES_PASSWORD}@db:5432/saturoom" \
  -e BOLA_DB_PASSWORD -e FNB_DB_PASSWORD -e MAHJONG_DB_PASSWORD \
  saturoom-app:latest pnpm --filter @saturoom/core migrate
cd $base/app && docker compose up -d
REMOTE
