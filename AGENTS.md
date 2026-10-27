# AGENTS.md — panduan kerja untuk agen AI (Codex, Claude Code, dll.)

Baca file ini sampai habis sebelum mengubah apa pun. Isinya: siapa pemiliknya, apa produknya, keputusan
yang sudah final, arsitektur, pola kode, aturan keamanan, status terakhir, dan pekerjaan berikutnya.
Riwayat keputusan lengkap ada di `RENCANA_FLOW.md` (bagian "Progres" di bawahnya = log harian).

---

## 1. Pemilik dan cara kerja

- Pemilik: non-teknis, berbahasa Indonesia santai. **Jawab dalam bahasa Indonesia, singkat, hemat token.**
  Jelaskan hasil, bukan proses. Jangan bertanya hal yang bisa diputuskan sendiri; tanya hanya untuk
  keputusan bisnis/produk atau tindakan berisiko.
- UI wajib: **ramah, premium, profesional, mudah dipakai orang awam, rounded, BUKAN "AI slop"**.
  Gaya aset unik ala Duolingo (maskot **Ruru**). Satu tema untuk semua kategori bisnis; maskot ganti kostum per kategori.
- **Responsif 3 ukuran wajib** untuk setiap halaman: HP (menu bawah), tablet `md` (rel ikon samping),
  desktop `lg` (sidebar penuh). Cek tanpa horizontal overflow di 390 / 820 / 1440 px.
- **Fitur harus saling terhubung**: data pemain ↔ tim ↔ jadwal ↔ absensi ↔ iuran saling tertaut
  (link ke halaman terkait, ringkasan lintas fitur). Fitur baru wajib ikut menautkan.
- Commit: author `nxtah <rizkynath543@gmail.com>`, remote `https://github.com/nxtah/SatuRoom.git`, branch `main`.
  Commit + push setelah fitur selesai dan lulus tes. Format pesan: Conventional Commits, bahasa Inggris.
- Setiap fitur selesai: tambahkan satu baris ke bagian Progres di `RENCANA_FLOW.md` (tanggal, apa, jumlah tes).

### Memahami permintaan pemilik

- Tangkap tujuan produk dari bahasa santai pemilik; lengkapi detail teknis dan UX yang lazim bila
  hasilnya jelas, aman, dapat dibatalkan, dan masih berada dalam ruang lingkup permintaan.
- **Default kerja adalah eksekusi sampai selesai:** bila tujuan dan hasil yang diinginkan sudah
  jelas, langsung telusuri kode, putuskan detail implementasi, kerjakan satu vertical slice utuh,
  tes, cek UI, perbarui dokumentasi/Progres, lalu commit dan push. Jangan berhenti hanya untuk
  meminta persetujuan atas langkah teknis biasa atau rencana yang sudah jelas.
- Jangan meminta klarifikasi untuk pilihan implementasi kecil (nama file, komponen, layout rinci,
  validasi umum, atau tes). Pilih solusi yang konsisten dengan pola kode dan jelaskan asumsi penting
  di hasil akhir.
- Jika permintaan masih punya beberapa arti, ambil tafsiran paling masuk akal dari dokumen, pola
  produk, dan percakapan sebelumnya lalu kerjakan. Bertanya hanya sebagai pilihan terakhir bila
  keputusan tidak bisa dibatalkan atau menyentuh production/VPS, DNS, secret, penghapusan permanen,
  uang nyata, atau data anak di luar kebijakan yang sudah disetujui.
- Bila permintaan besar, pecah menjadi vertical slice berurutan. Buat/ubah rencana di `docs/`,
  selesaikan satu slice lengkap, tes, cek UI, catat Progres, commit dan push sebelum slice berikutnya.
- Rujukan dokumentasi: mulai dari `docs/README.md`; `SatuRoom packs/` adalah referensi lokal
  historis, sedangkan `AGENTS.md` dan `RENCANA_FLOW.md` adalah sumber keputusan aktif.

## 2. Aturan keamanan (tidak boleh dilanggar)

- **Repo GitHub ini PUBLIK.** Jangan pernah commit: IP server, password, token, isi `.env*`, kunci SSH,
  atau data pribadi. Detail server ada di `.local/` (di-gitignore, hanya di laptop pemilik).
- Jangan tampilkan secret di output/laporan. Password root VPS tidak boleh disimpan atau dipakai; akses
  server hanya lewat kunci SSH. **Jangan ganti password root** (keputusan pemilik).
- Jangan ubah server production, DNS, firewall, database production, secret, atau konfigurasi deploy
  **tanpa izin eksplisit pemilik untuk tindakan itu**. Izin lama tidak berlaku untuk tindakan baru.
- Jangan jalankan perintah destruktif / migrasi yang tak bisa dibatalkan tanpa paham dampaknya.
- File migrasi yang sudah diterapkan **tidak boleh diubah** (runner mengecek checksum). Buat file baru.
- Data anak: pemain kebanyakan di bawah umur. Ikuti UU PDP: data minimum, persetujuan orang tua/wali
  dicatat (lihat akun pemain), akses dibatasi peran.

## 3. Produk

SatuRoom = platform manajemen bisnis per kategori. Sekarang hanya **akademi sepak bola**.
F&B dan aplikasi mobile native **tidak** dibangun sekarang.

| Folder | Domain | Isi | Port dev |
|---|---|---|---|
| `web/` | saturoom.com | Website publik (landing). CTA "Coba gratis", tanpa harga. | 3100 |
| `bola/` | bola.saturoom.com | Aplikasi akademi: UI Next.js + API `/api/v1` + `bola/server` | 3200 |
| `core/` | - | Schema bersama (akun, sesi, bisnis, keanggotaan), auth, runner migrasi | - |
| `infra/` | - | `docker-compose.dev.yml` (Postgres :5434, Mailpit SMTP :1026 / UI :8026) | - |
| `docs/` | - | `RISET_PERAN_DAN_FITUR.md` (riset peran & fitur akademi) | - |
| `SatuRoom-ClaudeCode-Starter-Pack/` | - | Dokumen brief asli dari pemilik (rujukan, jangan diubah) | - |

Kategori bisnis baru nanti = folder baru (mis. `fnb/`) + schema Postgres baru. Satu folder per kategori,
yang dibagi hanya database.

### Keputusan pemilik yang sudah final
1. Satu lokasi dulu, tapi data mendukung banyak cabang (`core.locations`).
2. Pelatih hanya melihat tim yang dipegangnya.
3. Data pemain wajib: nama, tanggal lahir, tim. Posisi dan nomor punggung opsional.
4. Iuran: pencatatan saja (tunai/transfer), **tanpa payment gateway**.
5. **Satu pemain = satu akun pemain** (bukan akun orang tua). Email boleh milik orang tua. Pemain <18 th:
   saat menerima undangan wajib isi nama orang tua/wali + centang persetujuan; disimpan di
   `bola.player_accounts.consent_at/consent_by`.
6. Font heading: Plus Jakarta Sans 800. Tema warna (lihat §6) sudah disetujui.

## 4. Stack

pnpm workspace (pnpm 10), Next.js 16.x (App Router, **versi baru — baca `node_modules/next/dist/docs/`
sebelum memakai API Next yang belum pasti**), React 19, Tailwind CSS v4, TypeScript strict,
Drizzle ORM 0.45 + `postgres` (postgres-js), zod 4, vitest, lucide-react. PostgreSQL 17.

## 5. Arsitektur bola/

```
bola/
  app/(auth)/        masuk, daftar, lupa/reset password, verifikasi
  app/(app)/         halaman staf (butuh akademi aktif): Beranda, jadwal, tim, pemain, iuran, staf, pengaturan
  app/saya/          portal AKUN PEMAIN (bukan staf)
  app/undangan/      terima undangan staf / akun pemain
  app/mulai/, app/pilih-akademi/
  app/api/v1/        route handler tipis: parse zod → panggil server/* → ok()/noContent()
  server/            semua logika bisnis + query (server-only)
  lib/               kode bersama client/server: schemas.ts (zod), dates, money, age, nav, api client
  components/        UI bersama (app-shell, nav, ruru, session-card, home-stats, ui/*)
  migrations/        SQL migrasi schema bola (0001..0008)
  scripts/seed-demo.ts  data demo lokal
  test/              vitest terhadap database nyata saturoom_test
```

### Database & multi-tenant
- Satu database, schema `core` dan `bola`. Migrasi SQL biasa, dijalankan `core/scripts/migrate.ts`
  (core dulu, lalu bola), lalu menyiapkan role `bola_app` (NOSUPERUSER, NOBYPASSRLS) + GRANT.
- Semua tabel akademi punya `business_id` dan **FORCE RLS** via `bola.enable_tenant_rls('bola.x')`,
  policy `business_id = core.current_business_id()`.
- `withContext(db, { userId, businessId }, tx => ...)` mengisi `app.user_id` / `app.business_id`.
  Di kode aplikasi selalu pakai `inAcademy(ctx, tx => ...)`.
- `REVOKE DELETE` untuk `bola_app` pada `bola.players`, `bola.teams`, `bola.invoices` (nonaktifkan/arsipkan saja).
- Lintas akademi (undangan, akun pemain) memakai fungsi `SECURITY DEFINER` yang memfilter
  `core.current_user_id()`. Fungsi baru: `REVOKE ALL ... FROM PUBLIC` di migrasi, lalu tambahkan ke daftar
  GRANT EXECUTE di `core/scripts/migrate.ts`.

### Peran & izin (`bola/server/permissions.ts`)
Peran: `owner`, `admin`, `head_coach`, `coach`, `treasurer` (Bendahara). Izin: `academy.update`,
`staff.read`, `staff.manage`, `teams.read_all`, `teams.manage`, `players.read_all`, `players.manage`,
`guardians.read`, `schedule.manage_all`, `attendance.record_all`, `billing.read`, `billing.manage`.
- Pelatih (`coach`) tanpa izin `_all`: dibatasi lewat `bola.team_coaches` (`visibleTeamIds`, `visiblePlayerIds`).
- Hanya owner yang boleh mengubah owner; owner terakhir tidak bisa dihapus.
- Akun pemain bukan staf (tanpa membership): akses hanya ke pemainnya lewat `bola.my_player()`.

### Fitur yang sudah ada
Auth (daftar, verifikasi email, login, reset password, rate limit), multi-akademi, onboarding checklist,
tim (preset KU PSSI), pemain, jadwal rutin + sesi satu kali/pertandingan + batal/pulihkan, absensi HP
(hadir/izin/sakit/alpa, "perlu perhatian" alpa 3x beruntun), staf + undangan + peran + tim,
iuran bulanan (tarif per tim, generate tagihan, lunas/batal/bebaskan/ubah nominal, pengingat WhatsApp),
statistik Beranda (ubin + grafik mingguan + per tim), akun pemain `/saya` (jadwal, izin/sakit sebelum
latihan → muncul di lembar absen pelatih, kehadiran, iuran), tautan antar halaman.

## 6. Pola kode (ikuti)

- Query: raw SQL `tx.execute(sql\`...\`)` di-cast ke tipe baris. **Selalu pakai alias tabel eksplisit**
  di subquery (interpolasi kolom drizzle di raw SQL menghasilkan nama tanpa tabel → bug). Daftar `IN`:
  `uuidList(ids)`.
- Fungsi server yang memanggil `requirePermission` harus `async` (agar error bisa di-catch).
- Error: `AppError(status, code, pesanIndonesia, fields?)`, `notFound("Pemain")`. 404 untuk data di luar cakupan.
- Tanggal "hari ini" pakai zona waktu akademi: `academyToday(tx)` (default Asia/Jakarta). Format tanggal di UI
  pakai `lib/dates.ts`, uang pakai `lib/money.ts` (`rupiah`, `monthLabel`).
- Setiap aksi tulis penting → `core.audit_events` (`action`, `targetType`, `targetId`, `meta`).
- Halaman staf: `const ctx = await requireAcademyPage()`. Route API: `route(async (req, ctx) => ...)`,
  `body(req, ZodSchema)`, `academyContext()` / `requireSession()`.
- Teks UI: Bahasa Indonesia, kalimat biasa (bukan ALL CAPS), tombol menyebut aksinya ("Simpan absen").
- Gaya: komentar sedikit dan bermakna, nama jelas, ikuti file di sekitarnya.

### Desain
Warna (token Tailwind): `pitch #0d3b2e`, `turf #1f8a5b`, `ember #ff6a00`, `sun #ffc93c`, `mist`, `chalk`, `ink`,
`ink-soft`, `line`. Panel `rounded-[2rem]`, kartu `rounded-[1.75rem]`, tombol pill. Animasi masuk `rise`, `pop`.
Warna status absen: hadir=turf, izin=sun, sakit=`#7a8cff`, alpa=`#d92d20` (`components/attendance-badge.tsx`).
Maskot `<Ruru pose="wave|happy|think|cheer" costume="academy" />`. Menu HP maksimal 5 item
(`lib/nav.ts`, item `mobile: "overflow"` pindah ke hub "Menu lainnya" di Pengaturan).

## 7. Menjalankan & mengetes

```bash
pnpm install
pnpm db:up
MIGRATOR_DATABASE_URL=postgresql://saturoom:saturoom-dev-only@localhost:5434/saturoom \
  BOLA_DB_PASSWORD=bola-dev-only pnpm db:migrate
cp bola/.env.example bola/.env.local
pnpm --filter @saturoom/bola dev          # http://localhost:3200
pnpm --filter saturoom-web dev            # http://localhost:3100
pnpm --filter @saturoom/bola seed:demo    # data demo (hanya mau jalan di localhost)
```

Akun demo (password `demo-saturoom-2026`, hanya database laptop): `pemilik@`, `admin@`, `kepalapelatih@`,
`pelatih@`, `bendahara@`, `pemain@` + `demo.saturoom.id`. Seed menolak bila akun demo sudah ada; reset dulu
(hapus invoice demo → bisnis demo → user demo, lewat psql sebagai `saturoom` di DB dev).

Sebelum commit, semua harus bersih:
```bash
cd bola && pnpm -s test && npx tsc --noEmit && npx eslint . && pnpm -s build
```
Tes memakai database `saturoom_test` (dibuat ulang otomatis). Tambahkan tes untuk tiap fitur: alur utama,
izin per peran, dan isolasi antar-akademi. Status terakhir: **44 tes lulus**.
UI dicek di browser (Playwright) pada 390/820/1440 px: tanpa overflow, tanpa error console.
Catatan: login dibatasi rate limit di memori; bila tes browser kena 429, restart dev server.

## 8. Server (VPS)

- Database production baru sudah jalan di VPS: `/opt/saturoom-platform` (docker compose, Postgres 17,
  **tanpa port publik**, network `saturoom-platform`). Migrasi 0001–0008 sudah diterapkan.
  Secret di `/opt/saturoom-platform/secrets/` (chmod 600) — jangan dibaca/ditampilkan.
- Aplikasi LAMA (`/opt/saturoom`, container `saturoom-postgres-1`) masih jalan; jangan disentuh tanpa izin.
- Cara menerapkan migrasi baru ke VPS: bundle `core/scripts/migrate.ts` dengan esbuild, salin bersama
  `core/migrations` + `bola/migrations` ke `/opt/saturoom-platform`, jalankan di container `node:22-alpine`
  pada network `saturoom-platform`. Detail host & perintah lengkap: `.local/SERVER.md` (tidak di git).
  Menerapkan migrasi ke VPS = perubahan production → minta izin pemilik dulu.

## 9. Berikutnya (urut prioritas)

1. **Deploy** (butuh izin pemilik): pemilik mengatur DNS `saturoom.com` & `bola.saturoom.com`.
   SMTP: pemilik ingin Gmail (`saturoomdigitalteknologi@gmail.com`) via App Password
   (`smtp.gmail.com:465`); App Password belum bisa dibuat karena verifikasi Google — alternatif Brevo.
   Lalu: build image `web` + `bola`, reverse proxy + HTTPS, `COOKIE_SECURE=true`, sambung ke DB platform,
   matikan aplikasi lama setelah pemilik setuju.
2. Halaman Privasi & Syarat di `web/`, kontak publik (email/WhatsApp) — menunggu data pemilik.
3. Backup database ke luar server (off-host) — ditunda pemilik.
4. Fitur kandidat: rapor/perkembangan pemain, link pendaftaran publik, pengumuman ke pemain,
   cabang/lokasi di UI, ekspor data.
