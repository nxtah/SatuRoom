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
- 2026-10-26 **Dashboard akun pemain**: portal `/saya` kini memiliki menu Beranda, Jadwal, Kehadiran, Iuran, dan Profil; tablet/desktop memakai rel navigasi, HP memakai bottom navigation floating. Semua data tetap langsung terhubung dari catatan staf akademi dan izin/sakit pemain tetap masuk ke absensi pelatih. Tes: 44 lulus.
- 2026-10-27 **Fondasi SatuRoom Rasa/F&B**: proyek `fnb/` terpisah (port 3300), schema database `fnb` dengan FORCE RLS, role operasional, outlet, menu, meja, pesanan, pembayaran, dapur, recipe dan stok; shell responsif serta layar awal Ringkasan, POS, Pesanan, Dapur, Stok, dan Menu. Rencana produk: `docs/RENCANA_FNB.md`.
- 2026-10-27 **Auth dan bisnis F&B**: login memakai akun SatuRoom bersama tetapi cookie produk terpisah; pengguna membuat bisnis F&B dengan outlet utama dan peran Pemilik secara atomik, lalu seluruh halaman operasional dilindungi konteks membership + RLS. Typecheck, lint, build lulus.
- 2026-10-27 **Menu F&B tersimpan di database**: kategori, station dapur, menu (nama, harga, station, status tersedia) dibuat lewat API ber-RLS dan langsung tampil di halaman Menu; login juga otomatis memilih bisnis F&B milik pengguna. Tes bola tetap 44 lulus; typecheck, lint, build F&B lulus; browser 390/820/1440 tanpa overflow.
- 2026-10-27 **POS, dapur, dan pesanan F&B**: kasir membuat pesanan dari menu tersedia (total dihitung server), tiket masuk ke layar Dapur yang diperbarui tiap 5 detik dengan aksi Mulai/Siap per item, lalu pesanan disajikan dan diselesaikan dari halaman Pesanan; runner migrasi juga tidak lagi mengubah password `fnb_app` saat hanya memperbarui produk lain. Tes bola 44 lulus; typecheck, lint, build F&B lulus; browser 390/820/1440 tanpa overflow.
- 2026-10-27 **Pembayaran dan shift kas F&B**: kasir membuka kas dengan uang awal, menerima pembayaran tunai/transfer/QRIS/kartu (boleh dicicil, lunas otomatis), membatalkan pembayaran beralasan, dan menutup kas dengan hitung selisih laci; riwayat pembayaran tampil di halaman Kas dan status Lunas muncul di Pesanan. Tes bola 44 lulus; typecheck, lint, build F&B lulus; browser 390/820/1440 tanpa overflow.
- 2026-10-27 **Bola: pendaftaran lewat link publik dan pengumuman**: admin membuat satu link pendaftaran (bisa dimatikan atau diganti), calon pemain mengisi nama, tanggal lahir, kontak wali, dan persetujuan orang tua tanpa login (dibatasi per alamat dan per link, jebakan bot, antrean maksimal 200), lalu admin menerima (jadi pemain beserta kontak wali, satu transaksi) atau menolak di Pemain > Pendaftar. Pengumuman untuk seluruh akademi atau satu tim: staf menulis (pelatih hanya untuk timnya), pemain melihat di portal, dan bisa dibagikan ke WhatsApp. Migrasi 0010 belum diterapkan ke VPS (menunggu izin pemilik). 60 tes bola lulus.
- 2026-10-27 **Pembelian bahan dan supplier F&B**: manajer atau staf inventori mencatat belanja per supplier (atau tanpa supplier), stok bahan bertambah otomatis dan harga rata-rata dihitung tertimbang dalam satu transaksi, tercatat di riwayat pergerakan stok dan audit. Halaman `/pembelian` terhubung dari Stok. 20 tes fnb lulus.
- 2026-10-27 **Bola: ekspor Excel (CSV)**: daftar pemain aktif dan iuran per bulan bisa diunduh dari halaman Pemain dan Iuran, mengikuti izin peran (kontak wali hanya untuk yang berhak), aman dari injeksi rumus Excel. 61 tes bola lulus.
- 2026-10-27 **Bola: rapor penilaian pemain**: pelatih (untuk pemain timnya) dan kepala pelatih (semua pemain) menilai teknik, pemahaman bermain, fisik, dan sikap skala 1 sampai 5 beserta catatan hal yang sudah bagus dan yang perlu dilatih, dari halaman pemain. Draf hanya terlihat pelatih; setelah dikirim, rapor muncul di akun pemain dan terkunci. Hanya penulis atau kepala pelatih yang boleh mengubah draf. Migrasi 0011 belum diterapkan ke VPS. 65 tes bola lulus.
- 2026-10-27 **Masuk dan daftar: Google atau email**: halaman masuk dan daftar Bola dan Rasa punya pilihan Google (OAuth dengan PKCE, tombol baru muncul bila kunci Google diisi di server) dan email-password. Daftar dengan email langsung masuk tanpa menunggu konfirmasi; email yang belum dikonfirmasi tetap bisa memakai aplikasi tetapi belum bisa melihat atau menerima undangan (akademi dan akun pemain, karena berisi data anak). Login Google ke email yang sudah ada menautkan akun dan membuang password yang belum terbukti. Rasa kini punya halaman daftar. Migrasi core 0003 belum diterapkan ke VPS. Butuh Client ID dan Secret dari Google Cloud (menunggu pemilik). 72 tes bola dan 20 tes fnb lulus.
- 2026-10-27 **Deploy produksi**: landing, Bola, dan Rasa tayang di saturoom.com, bola.saturoom.com, rasa.saturoom.com dengan HTTPS otomatis (Caddy), satu image Docker, migrasi core 0003, bola 0010 dan 0011, fnb 0001 sampai 0003 diterapkan ke database platform. Daftar dan masuk diuji langsung di domain asli. SMTP dan kunci Google menyusul.
- 2026-10-27 **Landing jadi halaman merek SatuRoom**: hero memperkenalkan dua aplikasi (Bola dan Rasa) dengan kartu pilih aplikasi, lalu satu bagian untuk Bola (absensi yang bisa dicoba, fitur) dan satu untuk Rasa (layar dapur yang bisa dicoba, empat fitur), langkah mulai, tanya jawab, dan ajakan ke kedua aplikasi. Menu masuk memilih Bola atau Rasa. Ruru berkostum koki untuk Rasa.
- 2026-10-27 **Tampilan baru: logo, maskot, grafik, efek gulir**: semua logo diganti logo-saturoom dan semua maskot Ruru diganti maskot naga oranye (maskot.png) di landing, Bola, dan Rasa, termasuk ikon tab. Landing: hero gelap dengan tanda S menyala yang bergerak saat digulir, baris kata berjalan, contoh dasbor Bola dan Rasa yang tegak saat masuk layar, fitur Rasa berukuran bervariasi, penutup dengan nama raksasa. Dasbor Bola dan Rasa kini memakai grafik SVG ringan buatan sendiri (garis tren mini, cincin progres, area halus, batang), tanpa pustaka grafik. Rasa mendapat sidebar gelap berikon, grafik penjualan 7 hari, menu terlaris, dan jam paling ramai (query baru salesSeries). Halaman lain Bola dan Rasa belum dipoles ulang. 21 tes fnb lulus.
- 2026-10-27 **ID bisnis dan landing per kategori**: tiap bisnis punya ID 8 karakter (migrasi core 0004, tampil di Beranda Bola dan Ringkasan Rasa). Masuk memakai ID bisnis, email, dan password, jadi satu orang dengan beberapa bisnis selalu membuka yang benar; pengguna yang belum punya bisnis (baru daftar atau diundang) boleh mengosongkan ID. Salah ID, bukan anggota, dan salah password memberi pesan yang sama. Login Google tetap tanpa ID (memilih bisnis lewat pilih-akademi). bola.saturoom.com dan rasa.saturoom.com kini membuka landing promosi masing-masing untuk pengunjung tanpa sesi; yang sudah masuk langsung ke dasbor. Migrasi 0004 belum diterapkan ke VPS. 76 tes bola dan 21 tes fnb lulus.
- Responsif HP dan tablet: landing web/Bola/Rasa pindah ke dua kolom di tablet, halaman detail pemain/tim tidak lagi meluap di 390 px, menu bawah Rasa memuat Beranda, POS, Pesanan, Dapur, dan tombol Lainnya.
- Identitas visual beda per produk: Bola kini atletik (navy dan hijau stabilo, judul miring condensed, garis lapangan, lini masa hari latihan, landing baru). Rasa kini hangat (krem, tomat, mentega, cokelat dapur, judul serif, nota pesanan, kartu menu dengan titik penuntun, layar tiket dapur, papan stok, kanopi toko di penutup). Hanya tampilan, tanpa ubah data. 76 tes bola dan 21 tes fnb lulus. Landing induk saturoom.com belum.
- Landing induk saturoom.com dirombak jadi editorial: putih hangat dan arang, judul Bricolage Grotesque, peta ekosistem (SatuRoom di tengah, terhubung ke Bola, Rasa, dan usaha berikutnya), bagian fondasi bersama (satu akun, ID bisnis, data terpisah), layar terbelah Bola (navy dan stabilo) dan Rasa (krem dan tomat), dua demo interaktif. Cerita fitur Bola dihapus karena sudah ada di landing Bola.
- 2026-10-29 **SatuRoom Sport (multi-cabang)**: folder `bola/` jadi `sport/`, domain `sport.saturoom.com` (bola.saturoom.com dialihkan permanen). Pemilik memilih cabang saat mendaftar (sepak bola, futsal, basket, voli, bulu tangkis, tenis, renang, lainnya); posisi pemain, nama tempat, warna aksen, dan maskot mengikuti cabang. Beranda mobile dipadatkan.
- 2026-10-29 **Pertandingan**: lawan, kandang/tandang, skor, catatan, dan susunan inti/cadangan di halaman sesi; hasil terbaru dan pertandingan berikutnya di Beranda; status susunan di akun pemain.
- 2026-10-29 **Lokasi**: beberapa lapangan/cabang per akademi (Pengaturan > Lokasi), dipilih saat membuat jadwal; jam bentrok di lokasi sama ditolak.
- 2026-10-29 **SatuRoom Mahjong** (`mahjong/`, mahjong.saturoom.com): lantai meja langsung, buka/pindah/tutup meja dengan tagihan per jam (pembulatan + minimal sewa), diskon member, pembayaran terpisah (tunai/QRIS/transfer/saldo), pesanan kantin dengan stok, booking tanpa bentrok + link publik `/pesan/[kode]`, member & saldo (ledger), turnamen dengan undian meja, skor, klasemen, laporan, 5 peran. Tema sendiri + halaman perkenalan. Belum dideploy (butuh DNS mahjong.saturoom.com dan izin pemilik).
- 2026-10-30 **Rasa: peran custom & staf** (fase 1 dari `fnb/docs rasa`): izin granular (jual, dapur, kas, batal bayar, menu, stok, pembelian, laporan, staf, peran), pemilik membuat peran custom di Peran dan memasangnya ke staf di Staf; peran bawaan tetap berlaku. Server menolak memberi izin yang tidak dimiliki pemberi, menjaga Pemilik terakhir, dan setiap perubahan tercatat di audit. Undangan email menyusul. Sudah tayang di produksi.
- 2026-10-30 **Rasa: undangan staf & akun**: pemilik mengundang staf lewat email dengan peran bawaan/custom (berlaku 14 hari, bisa dicabut), penerima menerima lewat halaman Undangan setelah email terkonfirmasi; konfirmasi email dan lupa password ditambahkan. Email baru terkirim setelah SMTP diisi (undangan tetap tersimpan tanpa email).
- 2026-10-30 **Rasa: varian, add-on, edit menu**: grup pilihan (Ukuran, Level gula, Topping) dengan minimal/maksimal pilihan dan harga tambahan, dipasang ke menu; kasir memilih lewat lembar pilihan, dapur dan daftar pesanan menampilkan pilihan dan catatan; menu bisa diubah/diarsipkan dengan riwayat harga. Harga dan opsi disalin ke pesanan sehingga struk lama tidak berubah.
- 2026-10-30 **Rasa: penjualan lengkap**: pajak dan service charge (Pengaturan), diskon dengan izin dan alasan, nomor struk per bisnis per hari, kunci idempotensi (klik ganda tidak membuat pesanan/pembayaran dobel), bayar tunai dengan uang diterima dan kembalian, tolak kelebihan bayar, shift wajib sebelum menerima bayar, kas masuk/keluar, refund berizin yang memotong laporan, selisih laci tersimpan saat tutup kas, struk cetak/PDF dari salinan transaksi, pembatalan pesanan wajib beralasan.
- 2026-10-30 **Rasa: stok opname dan bahan terbuang**: hitung fisik menggantikan angka sistem (selisih tercatat sebagai pergerakan opname), bahan terbuang/rusak dicatat dengan alasan, keduanya masuk audit log. Sudah tayang di produksi.
- 2026-10-30 **Rasa: meja, pindah, gabung, pisah tagihan**: kelola meja di Pengaturan, pilih meja di kasir (satu meja satu pesanan aktif), pindah meja, gabung pesanan, pisah tagihan per item dengan nomor struk baru. Total dihitung ulang dari tarif pesanan; pesanan sudah dibayar atau ber-diskon tidak bisa digabung/dipisah. Sudah tayang di produksi.
- 2026-10-30 **Rasa: pengeluaran operasional**: catat biaya (listrik, sewa, gaji) dengan izin khusus, bisa dibayar dari laci sehingga otomatis jadi kas keluar, pembatalan beralasan membalik kas, laporan harian menampilkan pengeluaran dan laba setelah pengeluaran. Sudah tayang di produksi.
- 2026-10-30 **Rasa: jejak aktivitas dan ekspor CSV**: halaman Jejak aktivitas (izin khusus, tersaring per jenis, hanya baca) dan unduh CSV penjualan per pesanan dari Laporan (rumus Excel dinetralkan, maksimal 366 hari). Sudah tayang di produksi.
- 2026-10-30 **Rasa: pelanggan dan voucher**: daftar pelanggan (nomor telepon unik) dengan jumlah dan total belanja dari pesanan, pilih pelanggan di kasir, voucher persen/rupiah dengan minimal belanja, kuota, masa berlaku dan aktif/nonaktif (dicek di server, kuota kembali bila pesanan dibatal, tidak bisa digabung diskon manual). Sudah tayang di produksi.
- 2026-10-30 **Rasa: dapur per station**: papan dapur bisa disaring per station, menampilkan nomor struk dan umur tiket (merah setelah 15 menit). Sudah tayang di produksi.
- 2026-10-30 **Rasa: Produk lengkap (Kategori, Menu, Add-on) dan menu bergrup**: menu samping dikelompokkan (Keuangan, Laporan, Produk, Inventaris, Bisnis; tablet memakai panel samping, HP memakai lembar Lainnya). Menu punya SKU, barcode, HPP dengan margin otomatis, kena pajak, tampil di kasir, urutan, stok barang jadi per cabang dengan buku stok, dan foto lewat Cloudinary (tanda tangan server, folder per bisnis; unggah aktif setelah kunci diisi). Add-on punya HPP, SKU, gambar, dan bisa memotong bahan stok. Baris pesanan menyimpan HPP dan status pajak saat transaksi. Kasir bisa cari/scan barcode dan melihat foto. Belum dideploy.
- 2026-10-30 **Rasa: Tipe pesanan, Diskon bernama, Grup meja**: tipe pesanan sendiri (GoFood, Reservasi, dan lain-lain) dengan service charge dan pajak per tipe serta wajib meja; diskon persen/rupiah per pesanan, kategori atau menu dengan jadwal hari dan jam, minimal belanja, tipe pesanan tertentu, dan otomatis berlaku di kasir; meja dikelompokkan per area. Belum dideploy.
- 2026-10-30 **Rasa: Laporan rinci, Riwayat transaksi, Payout**: 10 laporan (rincian penjualan, per produk, penerimaan, per kategori, tipe pesanan, diskon dan pajak, penggunaan barang, riwayat shift, catatan kas, pesanan dihapus) dengan filter tanggal dan kasir plus unduh CSV; Riwayat transaksi dengan pencarian, filter dan detail alur; Payout mencatat saldo non-tunai, rekening, pengajuan dan penarikan (transfer uang dilakukan pemilik sendiri, tanpa gateway). Belum dideploy.
- 2026-10-30 **Rasa: Beranda lengkap, Cabang, Barang per cabang, Transfer stok**: Beranda menampilkan perbandingan kemarin dan minggu lalu, laba kotor, nota, penjualan bulan ini, shift, tipe pesanan, dan menu sepi; Cabang punya jatah (1 gratis, cabang tambahan diajukan lalu dinaikkan admin secara manual, tanpa tagihan otomatis); Barang per cabang mengatur harga, HPP, ketersediaan, stok minimum, dan stok; Transfer stok antar cabang (draft, kirim, terima dengan selisih, batal). Kasir masih mencatat di cabang utama. Belum dideploy.
- 2026-10-30 **Rasa: Struk, Printer, Pelanggan, Akses pengguna**: halaman Struk dengan pratinjau langsung (logo Cloudinary, teks atas dan bawah, kertas 58/80 mm, bagian yang ditampilkan) dipakai struk cetak; Manajemen printer (nama, fungsi, kertas, salinan, bawaan, uji cetak lewat dialog cetak browser, belum ada sambungan langsung ke printer thermal); Pelanggan punya detail (menu favorit, riwayat transaksi) dan urutan; Akses pengguna (Pegawai, Peran dan izin) dengan izin dikelompokkan per modul dan tabel izin peran bawaan. Belum dideploy.
- 2026-10-30 **Rasa: email undangan pegawai lengkap**: email memuat ID bisnis, tombol buat akun (email terisi otomatis, penerima membuat password sendiri) dan tautan masuk; setelah daftar atau masuk langsung diarahkan ke halaman Undangan. Diuji end to end (undang, daftar, konfirmasi, terima, masuk dengan ID bisnis).
- 2026-10-30 **Rasa: profil bisnis + menu digital QR**: logo dan nama bisnis tampil di Beranda dan menu samping; logo bisa diunggah saat daftar bisnis (boleh dilewati) dan diubah di Pengaturan bersama kota dan alamat; tombol Keluar di menu samping, menu Lainnya, dan Pengaturan. Halaman Menu digital (QR) membuat kode QR, unduh PNG, cetak kartu meja; pelanggan membuka `/m/<ID bisnis>` tanpa login, menu mengikuti Produk dan diperbarui otomatis tiap 5 detik (harga, foto, Habis), bisa dimatikan dari Pengaturan. Menu bawah HP menyesuaikan jumlah item, rail tablet dilebarkan.
- 2026-10-31 **Rasa: alur tanpa dapur, papan dapur geser, menu dikelompokkan**: Pengaturan punya pilihan Alur pesanan (lewat dapur atau langsung disajikan; bila langsung, menu Dapur disembunyikan dan pesanan baru berstatus Disajikan). Papan dapur: kartu ditahan lalu digeser antar kolom Baru, Dimasak, Siap, dan area Sajikan (mouse dan sentuh), tombol tetap ada, di HP kolom jadi tab yang juga menjadi sasaran lepas. Menu samping dikelompokkan dengan nama kategori jelas (Operasional, Keuangan, Laporan, Menu dan produk, Stok dan pembelian, Pelanggan dan cabang, Tim dan akses, Pengaturan). Pesanan siap atau disajikan yang belum dibayar kini bisa dibatalkan.
- 2026-10-31 **Rasa: halaman Panduan** (`/docs`, terbuka tanpa login): 14 halaman bahasa sehari-hari (mulai dari nol, cara kerja, kasir, pesanan, dapur, kas, keuangan, laporan, menu, stok, pelanggan/cabang, tim/izin, pengaturan), halaman Pemecahan masalah berisi pesan galat beserta penyebab dan solusinya, Pertanyaan umum, dan kolom cari. Ditautkan dari menu samping, menu Lainnya di HP, dan halaman perkenalan.
- 2026-10-31 **Sport: email undangan lengkap**: email undangan staf dan akun pemain memuat ID bisnis, tombol buat akun (email terisi otomatis), dan tautan masuk; setelah daftar atau masuk dari email langsung diarahkan ke halaman undangan.
- 2026-10-31 **Sport: profil akademi + logo**: logo diunggah lewat Cloudinary (folder per akademi, tanda tangan dari server) saat membuat akademi (boleh dilewati) dan di Pengaturan; logo tampil di header dan Beranda; alamat lengkap bisa diisi.
- 2026-10-31 **Sport: peran buatan pemilik**: halaman Staf → Peran dan izin; pemilik membuat jabatan sendiri (nama, keterangan, centang izin per kelompok, ada contoh siap pakai), memasangnya saat mengundang atau mengubah staf; izin digabung dengan peran bawaan, tidak bisa memberi izin yang tidak dimiliki, peran dihapus = izin langsung dicabut, semua tercatat di jejak aktivitas.
- 2026-10-31 **Sport: jejak aktivitas, menu dikelompokkan, Panduan**: halaman Jejak aktivitas (saring per jenis, khusus izin audit); menu samping dikelompokkan (Latihan, Pemain dan tim, Keuangan, Komunikasi, Tim kerja dan akses, Akademi) dengan rel tablet lebih lebar; Panduan `/docs` terbuka tanpa login, 14 halaman bahasa sehari-hari termasuk Pemecahan masalah (pesan galat → penyebab → solusi), ditautkan dari menu, Pengaturan, dan halaman perkenalan; header HP tidak lagi menabrak avatar.
- 2026-10-31 **Sport: cabang dan modul (Fase 1)**: Pengaturan → Cabang (buat, ubah, arsipkan; lokasi otomatis per cabang), tim memilih tempat latihan sehingga ikut cabang, staf bisa dibatasi ke cabang tertentu (tim, pemain, iuran, staf, lokasi tersaring), Pengaturan → Modul untuk menyalakan/mematikan Iuran, Pengumuman, Rapor, Pertandingan, Pendaftaran, dan modul berikutnya (menu tersembunyi, aksi terkunci, data tetap).
- 2026-10-31 **Sport: program latihan dan absensi staf (Fase 2)**: halaman Program (Reguler/Elite/Kiper, level, iuran anjuran, tim di dalamnya, buat tim langsung dari program); Absensi staf: absen masuk/pulang sekali sehari, jadwal kerja mingguan per staf, pengajuan koreksi/cuti/lembur dengan persetujuan (koreksi disetujui mengganti catatan), papan hadir/terlambat/cuti hari ini, rekap bulanan untuk gaji; tombol Absen kerja di Beranda; panduan baru.
- 2026-10-31 **Sport: penilaian berversi dan target (Fase 3)**: halaman Penilaian dengan template siap pakai per cabang olahraga (keterampilan 1-5, tes fisik angka dengan arah "makin kecil/besar makin baik", sikap), ubah template = versi baru tanpa merusak hasil lama; penilaian pemain dari halaman pemain (draf/kirim, cakupan tim pelatih); panah perkembangan lintas versi; target perkembangan (tercapai/dibatalkan, bisa disembunyikan dari orang tua); akun pemain menampilkan Perkembangan dan Target.
- 2026-10-31 **Sport: keuangan dan akuntansi (Fase 4)**: pembukuan berpasangan otomatis (tagihan = Piutang/Pendapatan, bayar = Kas/Bank/Piutang, data lama ikut dijurnal), jurnal tidak bisa diubah/dihapus (koreksi lewat jurnal balik, dijaga di database), tutup buku per bulan, bagan akun bawaan yang bisa ditambah; iuran kini mendukung cicilan, potongan sekali, dan beasiswa rutin (persen/rupiah); halaman Keuangan: ringkasan, pengeluaran, laba rugi, neraca, arus kas, neraca saldo, buku besar, umur piutang, jurnal manual, rekonsiliasi kas/bank, tutup buku; izin baru lihat/catat keuangan dan tutup buku; panduan Keuangan.
