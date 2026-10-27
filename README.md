# SatuRoom

Satu folder per produk; yang dipakai bersama hanya database PostgreSQL (schema `core`).
Rencana dan keputusan: `RENCANA_FLOW.md`. Dokumen asli: `SatuRoom-ClaudeCode-Starter-Pack/`.

| Folder | Isi | Port dev |
|---|---|---|
| `web/` | saturoom.com, website publik | 3100 |
| `bola/` | bola.saturoom.com, aplikasi akademi (tampilan + API `/api/v1`) | 3200 |
| `fnb/` | produk operasional restoran/kafe, schema database `fnb` | 3300 |
| `core/` | schema bersama (akun, sesi, bisnis, keanggotaan), logika login, runner migrasi | - |

## Menjalankan di laptop

```bash
pnpm install
pnpm db:up                                   # Postgres :5434 dan Mailpit :8026
MIGRATOR_DATABASE_URL=postgresql://saturoom:saturoom-dev-only@localhost:5434/saturoom \
BOLA_DB_PASSWORD=bola-dev-only pnpm db:migrate
cp bola/.env.example bola/.env.local
pnpm --filter @saturoom/bola dev             # http://localhost:3200
pnpm --filter saturoom-web dev               # http://localhost:3100
```

Email saat dev (link konfirmasi, reset password) bisa dibaca di http://localhost:8026.

## Tes

`pnpm --filter @saturoom/bola test` membuat ulang database `saturoom_test`, menjalankan semua migrasi,
lalu menguji login, isolasi antar-akademi (RLS), dan izin per peran.

## Aturan database

- Tiap produk hanya mengubah schema miliknya (`core/migrations`, `bola/migrations`). File migrasi
  yang sudah diterapkan tidak boleh diubah; buat file baru.
- Aplikasi bola terhubung sebagai `bola_app`: bukan superuser, tidak bisa melewati RLS, tidak bisa membuat tabel.
- Semua data akademi punya `business_id` dan RLS; query lewat `inAcademy(ctx, ...)`.
