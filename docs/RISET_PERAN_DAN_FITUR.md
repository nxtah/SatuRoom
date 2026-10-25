# Riset peran dan fitur akademi sepak bola

Status: **desk research** dari sumber publik (situs dan pusat bantuan vendor, jurnal Indonesia), 2026-10-25.
Bukan wawancara atau uji pengguna; belum ada validasi dengan akademi nyata. Klaim vendor belum diverifikasi.

## 1. Temuan

| Temuan | Sumber |
|---|---|
| Aplikasi klub memberi akses per peran agar staf, pelatih, dan orang tua hanya melihat yang relevan. Pelatih dan orang tua memakai HP; admin, direktur teknik, dan manajer tim memakai tampilan kantor. | [PlayMetrics di Techjockey](https://www.techjockey.com/detail/playmetrics) |
| Peran pelatih, manajer tim, dan direktur biasanya **juga butuh penugasan ke tim** agar bisa melihat data; peran saja tidak cukup. | [Sprocket: staff permissions](https://help.sprocketsports.com/en/articles/13863801-staff-permissions-explained), [Sprocket: roles access](https://help.sprocketsports.com/en/articles/13853917-roles-access) |
| Satu orang bisa punya beberapa peran (misalnya orang tua sekaligus manajer tim) dan berpindah peran di aplikasi. | [Manual Team Manager Fusion (PlayMetrics)](https://irp.cdn-website.com/f0450f01/files/uploaded/Fusion+Team+Manager+Manual.pdf) |
| Orang tua/wali mengelola undangan dan kehadiran anak; satu anak boleh punya banyak wali; anak tidak perlu akun sendiri; satu orang tua bisa punya beberapa anak. | [Spond: parent/guardian](https://help.spond.com/en/articles/26078-using-the-spond-app-as-a-parent-or-guardian), [Spond: guardians](https://www.spond.com/news-and-blog/add-guardians-spond-safeguarding-and-transparency/) |
| Admin bisa meminta konfirmasi kehadiran sebelum latihan (availability) ke penerima tertentu dan mengirim pengingat. | [Spond: features](https://help.spond.com/en/articles/28547-spond-features-overview) |
| Akademi butuh dua sisi: bisnis (pendaftaran, tagihan, jadwal, komunikasi keluarga) dan pembinaan (perkembangan pemain, absensi, catatan sesi, kelompok umur). Banyak anak dalam satu keluarga. | [ClassCard: football academy software 2026](https://www.classcardapp.com/blog/best-football-academy-management-software-in-2026), [LoveAdmin](https://loveadmin.com/who-we-help/football-academy-management-software/) |
| Di Indonesia, aplikasi SSB yang ada (Bolasoft, prototipe kampus) berfokus pada absensi, performa latihan, pembayaran iuran, jadwal turnamen, dan pendaftaran online. Banyak SSB masih mencatat manual di buku. | [detik: Bolasoft](https://inet.detik.com/mobile-apps/d-5506802/dear-pssi-ayo-cek-aplikasi-sepakbola-bolasoft-dari-purwokerto), [JATI ITN: aplikasi SSB mobile](https://ejournal.itn.ac.id/jati/article/view/11187), [JATI ITN: pendaftaran SSB](https://ejournal.itn.ac.id/jati/article/view/13073), [Unindra: eReport](https://journal.unindra.ac.id/index.php/jap/article/download/2373/pdf) |
| Kurikulum PSSI (Filanesia, 2017) membagi pembinaan usia muda ke KU 6-9, 10-13, 14-17; praktik SSB bervariasi. | [Medcom](https://www.medcom.id/bola/indonesia/aNrVV3PN-peranan-milla-dalam-pembuatan-kurikulum-sepak-bola-indonesia), [Unimed](https://digilib.unimed.ac.id/id/eprint/63076/2/8216117003_Abstrak.pdf) |

## 2. Model peran yang diusulkan (dan sudah disiapkan di database)

Tiga lapis, supaya peran baru tidak perlu bongkar ulang:

1. **Peran staf** (per akademi, boleh lebih dari satu per orang; izin = gabungan):
   Pemilik, Admin, Kepala pelatih, Pelatih. Siap ditambah: Manajer tim, Bendahara, Fisioterapis.
2. **Penugasan ke tim** (siapa melatih tim mana). Pelatih hanya melihat pemain, jadwal, dan absensi tim yang ditugaskan. Kepala pelatih dan admin melihat semua tim.
3. **Hubungan wali** (orang tua/wali ke pemain tertentu). Wali bukan staf: hanya melihat anak yang ditautkan, dan hanya kolom yang diizinkan. Satu wali boleh punya banyak anak; satu anak boleh punya banyak wali; satu orang bisa sekaligus pelatih dan orang tua.

Tabel izin ada di `bola/server/permissions.ts`; penugasan tim di `bola.team_coaches`. Portal orang tua (lapis 3) dibangun setelah keputusan pemilik soal data anak (lihat kebijakan data).

## 3. Fitur yang umum dibutuhkan, diurutkan untuk SatuRoom Bola

| Prioritas | Fitur | Catatan |
|---|---|---|
| Tahap 2 (sekarang) | Tim/kelompok umur, pemain, pelatih per tim | Saran KU mengikuti PSSI (6-9, 10-13, 14-17), bebas diubah |
| Tahap 3 | Jadwal latihan berulang, absensi di HP, rekap kehadiran, tanda "sering absen" | Alur paling sering dipakai pelatih |
| Tahap 4 | Undang staf, ubah peran, cabut akses, tugaskan pelatih ke tim | |
| Berikutnya (perlu persetujuan) | Iuran bulanan dan tagihan | Ada di hampir semua aplikasi SSB Indonesia |
| Berikutnya | Portal orang tua: jadwal anak, konfirmasi hadir/izin sebelum latihan | Mengurangi tanya-jawab di WhatsApp |
| Berikutnya | Rapor/penilaian perkembangan pemain per periode | Butuh format penilaian dari pelatih |
| Berikutnya | Pendaftaran pemain baru lewat link publik | Butuh persetujuan wali di form |
| Nanti | Pertandingan/turnamen, susunan pemain, hasil | |
| Nanti | Pengumuman dan pengingat (WhatsApp/email) | Butuh penyedia pesan |
| Hati-hati | Dokumen pemain (akta, KK) untuk verifikasi umur turnamen | Data sensitif anak; perlu kebijakan khusus |

## 4. Yang perlu divalidasi dengan akademi nyata
Urutan prioritas di atas, apakah orang tua perlu login di pilot, format rapor, cara bayar iuran (transfer, tunai), dan siapa yang mencatat absensi (pelatih atau admin).
