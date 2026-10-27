#!/usr/bin/env bash
# Dijalankan SEKALI di VPS (sebagai root). Membuat file env aplikasi dari rahasia yang sudah ada di server.
# Tidak mencetak rahasia apa pun. Idempoten: file yang sudah ada tidak ditimpa.
set -euo pipefail
base=/opt/saturoom-platform
mkdir -p "$base/apps" "$base/app"
chmod 700 "$base/apps"

if [ ! -f "$base/secrets/fnb-db.env" ]; then
  umask 077
  echo "FNB_DB_PASSWORD=$(openssl rand -hex 24)" > "$base/secrets/fnb-db.env"
fi

enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$1"; }
bola_pw=$(enc "$(grep '^BOLA_DB_PASSWORD=' "$base/secrets/bola-db.env" | cut -d= -f2-)")
fnb_pw=$(enc "$(grep '^FNB_DB_PASSWORD=' "$base/secrets/fnb-db.env" | cut -d= -f2-)")

umask 077
if [ ! -f "$base/apps/bola.env" ]; then
  cat > "$base/apps/bola.env" <<ENV
DATABASE_URL=postgresql://bola_app:${bola_pw}@db:5432/saturoom
APP_URL=https://bola.saturoom.com
SITE_URL=https://saturoom.com
# SMTP belum diisi: email konfirmasi, lupa password, dan undangan belum terkirim sampai bagian ini diganti.
SMTP_HOST=localhost
SMTP_PORT=25
MAIL_FROM="SatuRoom Bola <no-reply@saturoom.com>"
COOKIE_SECURE=true
ENV
fi
if [ ! -f "$base/apps/fnb.env" ]; then
  cat > "$base/apps/fnb.env" <<ENV
DATABASE_URL=postgresql://fnb_app:${fnb_pw}@db:5432/saturoom
APP_URL=https://rasa.saturoom.com
COOKIE_SECURE=true
ENV
fi
echo "env aplikasi siap"
