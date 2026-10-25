# Rencana flow SatuRoom (draf untuk dikoreksi pemilik)

Status: **Disetujui pemilik 2026-10-25** (struktur dan keputusan di bawah). Disusun 2026-10-25 dari dokumen asli di `SatuRoom-ClaudeCode-Starter-Pack` (CLAUDE.md, 00–05, 13, prompt fase 1–5). Belum ada kode yang ditulis. Kode lama di `PROJECTS/saturoom` tidak dihapus; hanya jadi referensi.

## Kenapa dibangun ulang

Aplikasi lama adalah aplikasi bisnis umum: daftar → buat "bisnis" → pilih kategori (akademi/F&B/mahjong) → aktifkan modul di Pengaturan. Dokumen meminta produk khusus akademi sepak bola di `bola.saturoom.com`, website publik terpisah di `saturoom.com`, dan F&B **tidak** dibangun sekarang.

## Struktur folder (disetujui pemilik 2026-10-25)

Tiap produk adalah proyek sendiri; yang dipakai bersama hanya database PostgreSQL di VPS.

```
SATUROOM/
  web/    saturoom.com, website publik (dikerjakan pertama)
  bola/   bola.saturoom.com, aplikasi akademi (tampilan + backend sendiri)
  fnb/    nanti
  core/   skema database bersama: akun, login, bisnis, keanggotaan
  docs/   dokumen Starter Pack
```

Aturan database bersama:
1. Satu database, satu schema per produk (`core`, `bola`, nanti `fnb`). Produk hanya mengubah schema miliknya.
2. Tabel akun/login/bisnis hanya diubah lewat migrasi di `core/`, supaya satu akun bisa dipakai lintas produk.
3. Tiap produk punya user database sendiri dengan izin minimum; `bola` tidak bisa membaca `fnb`, dan sebaliknya.

Harus bisa tumbuh tanpa bongkar ulang (permintaan pemilik): cabang/lokasi tambahan, peran tambahan (manajemen lain), banyak pelatih per tim, banyak akademi per akun, kategori bisnis baru sebagai folder baru.

## A. saturoom.com (website publik)

Satu halaman panjang yang bisa di-scroll, plus halaman Privasi dan Syarat.

1. Pembuka: Ruru berkostum bola, satu kalimat apa itu SatuRoom Bola, tombol "Coba gratis" (ke `bola.saturoom.com/daftar`) dan "Masuk".
2. Masalah yang diselesaikan: absen di kertas, jadwal di grup WhatsApp, data pemain di spreadsheet.
3. Fitur yang benar-benar ada (hanya yang sudah jadi): pemain, tim, jadwal latihan, absensi di HP, staf dan peran.
4. Cara mulai: 3 langkah (daftar, isi data akademi, tambah pemain).
5. Tanya jawab (FAQ).
6. Kontak/WhatsApp dan ajakan terakhir.

Tidak menampilkan F&B atau produk lain sebagai "tersedia".

## B. bola.saturoom.com (aplikasi akademi)

### B1. Daftar dan masuk
Daftar (nama, email, password) → cek email → klik link konfirmasi → masuk.
Punya lebih dari satu akademi → pilih akademi; satu akademi → langsung masuk.

### B2. Onboarding (satu langkah per layar, ada progress bar, bisa dilewati dan dilanjutkan nanti)
1. Selamat datang (Ruru menyapa, jelaskan 5 langkah).
2. Data akademi: nama akademi, kota (wajib); alamat lapangan, logo (opsional).
3. Undang staf: email + peran, atau "Nanti saja".
4. Buat tim pertama: nama (contoh U-10, U-12), pelatih (opsional).
5. Tambah pemain pertama: nama, tanggal lahir, tim; kontak wali opsional.
6. Jadwalkan latihan pertama: tim, hari, jam, lokasi; bisa berulang tiap minggu.
7. Selesai: Ruru merayakan, ringkasan, tombol ke Beranda.

Tidak ada pilihan kategori, tidak ada "aktifkan modul".

### B3. Menu aplikasi
- **Beranda**: latihan hari ini (dengan tombol "Absen"), hal yang perlu perhatian (misalnya pemain absen 3x berturut-turut), sisa langkah setup.
- **Jadwal**: kalender mingguan latihan per tim; buat/ubah/batalkan sesi.
- **Pemain**: daftar, cari, filter per tim, detail pemain, riwayat kehadiran; nonaktifkan (bukan hapus).
- **Tim**: daftar tim, pemain di tiap tim, pelatih tim.
- **Staf**: undang, ubah peran, cabut akses.
- **Pengaturan**: profil akademi, akun saya.

### B4. Flow pelatih di HP (alur paling sering)
Masuk → Beranda menampilkan latihan hari ini milik timnya → tap "Absen" → daftar pemain dengan tombol besar Hadir / Izin / Sakit / Alpa → Simpan → Ruru "Absen tersimpan".

### B5. Peran (usulan, dari dokumen 04 dan 07)

| Bisa apa | Pemilik | Admin | Kepala pelatih | Pelatih |
|---|---|---|---|---|
| Ubah data akademi | ya | tidak | tidak | tidak |
| Undang/cabut staf | ya | ya | tidak | tidak |
| Tambah/ubah pemain | ya | ya | ya | tidak |
| Lihat pemain | semua | semua | semua | tim sendiri |
| Kontak wali | ya | ya | tidak | tidak |
| Kelola tim | ya | ya | ya | tidak |
| Jadwal latihan | ya | ya | ya | tim sendiri |
| Absensi | ya | ya | ya | tim sendiri |

Orang tua/wali: tidak punya login di versi pertama (dokumen: belum diputuskan).

## Yang sengaja tidak dibangun dulu
F&B, mahjong, aplikasi HP native, portal orang tua, catatan perkembangan pemain. Iuran/tagihan menunggu keputusan (lihat pertanyaan 1).

## Keputusan pemilik (2026-10-25: "pakai saran")
1. Iuran: nanti, bukan versi pertama.
2. Cabang: satu lokasi dulu, tapi struktur data sudah mendukung banyak cabang.
3. Pelatih: hanya melihat tim sendiri.
4. Website: tombol "Coba gratis", tanpa harga.
5. Data wajib pemain: nama, tanggal lahir, tim; posisi dan nomor punggung opsional.

Visual: premium, profesional, rounded, mudah untuk orang awam.

## Pertanyaan awal (sudah dijawab di atas)
1. Iuran/tagihan bulanan masuk versi pertama atau nanti?
2. Akademi punya lebih dari satu lokasi/cabang di pilot?
3. Pelatih hanya boleh melihat pemain timnya sendiri? (usulan: ya)
4. Website: ada harga? Kalau belum, tombolnya "Coba gratis" atau "Hubungi kami"?
5. Data pemain yang wajib selain nama, tanggal lahir, tim? (posisi, nomor punggung?)

## Urutan pengerjaan (berhenti untuk review tiap tahap)
1. Fondasi: folder, akun, akademi, peran, keamanan antar-akademi, tema Ruru.
2. Onboarding + tim + pemain.
3. Jadwal + absensi (termasuk flow pelatih di HP).
4. Staf dan peran.
5. Website saturoom.com.
6. Pengerasan, uji di HP, deploy ke VPS (dengan persetujuan).

## Progres

- 2026-10-25 **web/** landing page selesai (disetujui pemilik, font Plus Jakarta Sans).
- 2026-10-25 **Tahap 1 bola/** selesai: daftar, konfirmasi email, masuk/keluar, lupa password, onboarding (selamat datang + data akademi), pilih/ganti akademi, Beranda, Pengaturan profil akademi. Database: schema `core` + `bola`, RLS, user `bola_app`. Tes: 13 lulus (login, isolasi, izin).
- 2026-10-26 **Tahap 2 bola/** selesai: Tim (buat dengan saran KU PSSI, ubah, arsipkan), Pemain (tambah beruntun, cari, saring per tim, nonaktifkan, kontak wali khusus Pemilik/Admin), persiapan di Beranda dihitung dari data. Pelatih hanya melihat tim yang ditugaskan (`bola.team_coaches`). Riset peran dan fitur: `docs/RISET_PERAN_DAN_FITUR.md`. Tes: 21 lulus.
- 2026-10-26 **Tahap 3 bola/** selesai: jadwal rutin mingguan (sesi dibuat otomatis, jam lokal akademi), sesi tambahan/pertandingan, batalkan/pulihkan sesi, kalender mingguan, absensi Hadir/Izin/Sakit/Alpa di HP (bisa diubah, riwayat utuh walau pemain pindah/nonaktif), Beranda "Hari ini" + "Perlu perhatian" (alpa 3x berturut-turut), riwayat kehadiran di detail pemain. Pelatih mengatur jadwal dan absensi tim sendiri saja. Tes: 30 lulus.
- 2026-10-26 **Tahap 4 bola/** selesai: halaman Staf (daftar, undang lewat email, batalkan undangan, ubah peran ganda + tim yang dipegang, nonaktifkan/aktifkan), halaman /undangan untuk penerima (bukti = email terverifikasi yang sama), menu sesuai izin. Aturan: hanya Pemilik yang mengatur Pemilik, akademi selalu punya minimal satu Pemilik, tidak bisa menonaktifkan diri sendiri. Perbaikan: umur tim boleh dikosongkan. Tes: 37 lulus.
- 2026-10-26 **Iuran bulanan bola/** selesai: tarif per tim, buat tagihan sekali klik (tarif tertinggi bila di beberapa tim, tidak dobel), tandai lunas tunai/transfer, batalkan, bebaskan (beasiswa), ubah nominal, pengingat WhatsApp ke wali, ringkasan di Beranda. Peran baru Bendahara. Pencatatan saja, tanpa payment gateway. Tes: 42 lulus.
- 2026-10-26 **Statistik Beranda**: ubin pemain aktif, kehadiran 30 hari, latihan minggu ini, iuran terkumpul; grafik kehadiran per minggu (6 minggu) dan per tim. Mengikuti cakupan peran (pelatih hanya timnya). Perbaikan: Beranda tidak lagi memuat ulang tanpa henti saat akademi belum terpilih di sesi. Database baru dibuat di VPS (`/opt/saturoom-platform`, terpisah dari database lama, tanpa port publik), semua migrasi sudah diterapkan. Tes: 43 lulus.
- 2026-10-26 **Portal orang tua** (`/wali`): akademi mengundang wali lewat email dari halaman pemain; wali melihat latihan 2 minggu ke depan, mengirim izin/sakit sebelum latihan (langsung terisi di lembar absen pelatih), kehadiran 60 hari, dan status iuran. Satu akun bisa memegang beberapa anak. Akun wali bukan staf: akses hanya ke anak yang terhubung (dicek lewat fungsi database). Seed demo: riwayat 6 minggu dan akun `wali@demo.saturoom.id`. Tes: 44 lulus.
- 2026-10-26 **Koreksi: akun pemain, bukan akun orang tua.** Satu pemain satu akun (dikunci di database). Saat menerima undangan, pemain di bawah 18 tahun wajib mencantumkan nama orang tua/wali dan persetujuan (UU PDP); persetujuan disimpan. Portal di `/saya`.
- 2026-10-26 **Responsif 3 ukuran**: HP (menu bawah), tablet (rel ikon di samping), desktop (sidebar penuh); halaman tim, pemain, dan akun pemain dua kolom di layar lebar. Audit 11 halaman x 3 ukuran: tanpa overflow, tanpa error.
- 2026-10-26 **Fitur saling terhubung**: halaman pemain menampilkan jadwal berikutnya, kehadiran, iuran (ke bulan iuran terkait), dan akun pemain; halaman tim menampilkan kehadiran, tarif iuran, dan jadwal berikutnya; daftar iuran tertaut ke pemain; izin dari akun pemain muncul di lembar absen.
