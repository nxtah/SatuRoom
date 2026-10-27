# Arah pengembangan SatuRoom Bola

Status: **rencana kerja** — diperbarui 2026-10-27. Keputusan final tetap ada di `AGENTS.md` dan
`RENCANA_FLOW.md`.

## Prinsip produk

SatuRoom Bola adalah sistem operasi akademi sepak bola, bukan dashboard umum. Setiap peran harus
mendapat tindakan yang relevan, data yang sama harus mengalir ke fitur terkait, dan data anak hanya
terbuka kepada peran yang berhak.

### Tema dan UX

- Akademi sepak bola: warna lapangan, hijau `pitch`/`turf`, oranye `ember` sebagai aksi utama,
  maskot Ruru berkostum akademi, kartu rounded dan informasi yang mudah dipindai.
- HP: bottom navigation floating maksimal lima tujuan utama. Tablet: rel ikon samping. Desktop:
  sidebar penuh. Wajib diuji pada 390, 820, dan 1440 px.
- Setiap halaman menjawab: pengguna sedang di mana, apa tindakan berikutnya, dan dampaknya ke siapa.
- Jangan membuat menu, statistik, atau tombol tanpa alur data dan izin yang benar-benar berfungsi.

## Yang sudah tersedia

Auth, multi-akademi, onboarding, tim, pemain, jadwal, absensi manual, staf dan penugasan tim,
iuran per tim, statistik Beranda, akun pemain, serta portal pemain dengan Beranda/Jadwal/Kehadiran/
Iuran/Profil.

## Peta peran dan hubungan data

| Peran | Fokus dashboard | Data yang terhubung |
|---|---|---|
| Pemilik | kesehatan akademi, staf, cabang, pendapatan | semua cabang dan laporan |
| Admin | operasional pemain, tim, jadwal, cabang | pemain ↔ tim ↔ jadwal ↔ iuran |
| Kepala pelatih | kualitas latihan dan perkembangan | semua tim, rapor, absensi |
| Pelatih | latihan hari ini dan tim sendiri | tim sendiri ↔ absensi ↔ rapor |
| Bendahara | paket, tagihan, pembayaran, tunggakan | pemain ↔ paket ↔ tagihan |
| Pemain | jadwal, kehadiran, iuran, rapor pribadi | hanya data pemainnya sendiri |

## Roadmap fitur

### 1. Absensi QR kamera — keputusan final

**Tujuan:** pemain membuka QR dari akun `/saya`; pelatih atau kepala pelatih memindai dengan kamera
di sesi latihan dan pemain langsung tercatat hadir.

- QR token acak, pendek masa berlakunya, tersimpan hanya dalam bentuk hash, dan hanya berlaku untuk
  akun pemain serta sesi/tim yang sesuai.
- Kamera hanya dipakai setelah aksi sadar dari pelatih; tidak ada pengenalan wajah atau data biometrik.
- Pemindaian mengikuti cakupan tim pelatih yang sedang masuk. Pemindai tidak bisa mengabsen pemain
  di luar timnya.
- Jika QR tidak valid, kedaluwarsa, sesi dibatalkan, atau pemain sudah diabsen, tampilkan alasan jelas.
- Hasil scan masuk ke lembar absensi, riwayat pemain, statistik tim, dan audit event.

### 2. Cabang/lokasi

**Tujuan:** pemilik/admin mengelola lokasi latihan saat akademi berkembang tanpa membocorkan data
antar cabang.

- CRUD cabang: nama, kota, alamat/lapangan, status aktif.
- Tim dan sesi dapat ditautkan ke cabang; pemain, iuran, dan laporan bisa disaring cabang.
- Mulai dari satu lokasi yang sudah ada; data lama mendapat lokasi default secara aman lewat migrasi
  baru. Tidak mengubah migrasi lama.
- Pelatih tetap dibatasi penugasan tim, bukan otomatis semua data cabang.

### 3. Paket dan iuran

**Tujuan:** bendahara/admin bisa membuat penawaran iuran yang jelas dan riwayatnya dapat dilihat
pemain.

- Paket: nama, nominal, periode, jenis (bulanan/per sesi/program), cabang atau tim sasaran, status.
- Keikutsertaan pemain pada paket; harga terkunci pada tagihan yang sudah dibuat.
- Tagihan, pembayaran tunai/transfer, pembebasan, diskon, tunggakan, bukti dan audit.
- Pemain hanya melihat paket dan tagihan miliknya; bendahara hanya mengelola data keuangan.
- Payment gateway tetap di luar ruang lingkup sampai pemilik menyetujuinya.

### 4. Rapor digital dan perkembangan

**Tujuan:** pelatih mencatat perkembangan pemain per periode, kepala pelatih menjaga kualitas,
dan pemain melihat hasilnya.

- Periode rapor, rubrik versi-terkunci, nilai dan catatan per pemain.
- Area awal yang direkomendasikan: teknik, taktik, fisik, disiplin/sikap, kehadiran, dan catatan
  pelatih. Bobot/rubrik harus bisa diputuskan akademi, bukan dibuat sewenang-wenang per pelatih.
- Pelatih menilai tim sendiri; kepala pelatih meninjau semua tim; admin/pemilik melihat ringkasan;
  pemain hanya melihat rapor yang sudah diterbitkan untuk dirinya.
- Riwayat rapor tidak ditimpa. Revisi tercatat, periode lama tetap bisa dibaca.
- Statistik: tren pemain, distribusi tim, kehadiran vs perkembangan, dan area yang perlu perhatian.

### 5. Komunikasi dan pendaftaran

- Pengumuman terarah ke cabang/tim/pemain dengan riwayat baca bila diperlukan.
- Pendaftaran publik dengan persetujuan wali, status tindak lanjut, lalu konversi terkontrol menjadi
  pemain aktif.
- Ekspor data berbasis izin dan audit; tidak ada ekspor massal bagi pelatih biasa.

## Urutan implementasi

1. QR absensi sebagai satu vertical slice lengkap.
2. Cabang/lokasi dan filter cakupan data.
3. Paket iuran di atas pencatatan iuran yang telah ada.
4. Rapor digital beserta statistik dan riwayat.
5. Pengumuman, pendaftaran publik, lalu ekspor sesuai kebutuhan pilot.

Setiap tahap wajib mencakup migration baru bila schema berubah, API, izin server-side/RLS, audit,
halaman pemain bila relevan, tes alur utama + allow/deny + isolasi antar-akademi, dan cek UI tiga
ukuran layar.

## Keputusan yang perlu ditanya sebelum tahapnya dimulai

| Fitur | Keputusan bisnis yang dibutuhkan |
|---|---|
| Cabang | Apakah admin boleh menonaktifkan cabang, atau hanya pemilik? |
| Paket iuran | Jenis paket dan aturan diskon/beasiswa yang benar-benar dipakai akademi. |
| Rapor | Rubrik final, periode rapor, skala nilai, serta siapa yang menyetujui penerbitan. |
| Pengumuman | Kanal pengiriman awal: hanya di aplikasi, email, atau WhatsApp. |
| Pendaftaran | Data minimum calon pemain dan persetujuan wali yang wajib. |
