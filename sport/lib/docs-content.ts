/** Isi panduan SatuRoom Sport. Bahasa sehari-hari; **tebal** untuk nama tombol dan menu. */
export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "steps"; items: string[] }
  | { t: "list"; items: string[] }
  | { t: "tip"; text: string }
  | { t: "warn"; text: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "fix"; items: { problem: string; cause: string; fix: string }[] };

export type DocPage = { slug: string; group: string; title: string; summary: string; blocks: Block[] };

export const DOC_GROUPS = ["Mulai", "Latihan harian", "Pemain dan tim", "Uang dan kabar", "Akademi dan staf", "Bantuan"] as const;

export const DOCS: DocPage[] = [
  {
    slug: "mulai", group: "Mulai", title: "Mulai dari nol", summary: "Daftar, buat akademi, dan siap absen latihan pertama dalam sekitar 15 menit.",
    blocks: [
      { t: "p", text: "SatuRoom Sport adalah aplikasi untuk akademi olahraga: tim, pemain, jadwal latihan, absensi, iuran, pengumuman, dan rapor dalam satu tempat. Bisa dipakai untuk sepak bola, futsal, basket, bola voli, bulu tangkis, tenis, renang, dan olahraga lain." },
      { t: "h", text: "Langkah awal untuk pemilik" },
      { t: "steps", items: [
        "Buka sport.saturoom.com lalu klik **Coba gratis**. Isi **Nama Anda**, **Email**, dan **Password** (minimal 8 karakter). Bisa juga **Daftar dengan Google**.",
        "Buka email dari SatuRoom (cek juga folder spam) lalu klik tombol konfirmasi.",
        "Pilih **cabang olahraga** akademi. Pilihan ini mengatur istilah dan posisi pemain.",
        "Isi **Nama akademi** dan **Kota**, lalu klik **Simpan dan lanjut**.",
        "Unggah **logo akademi** (JPG, PNG, atau WebP, maksimal 5 MB). Boleh **Lewati**, bisa dipasang nanti di Pengaturan.",
        "Anda masuk ke **Beranda**. Catat **ID bisnis** (8 karakter, contoh `K7M2-QX9P`) yang tampil di bagian atas. ID ini dipakai setiap masuk.",
      ] },
      { t: "h", text: "Daftar persiapan di Beranda" },
      { t: "p", text: "Beranda menampilkan **Persiapan akademi**. Centangnya terisi otomatis dari data, bukan dicentang manual." },
      { t: "steps", items: [
        "**Data akademi**: sudah selesai saat akademi dibuat. Bisa dilengkapi (alamat, logo) di Pengaturan.",
        "**Buat tim pertama**: satu tim biasanya satu kelompok umur, misalnya KU 10-13.",
        "**Tambah pemain pertama**: isi nama, tanggal lahir, dan tim.",
        "**Atur jadwal latihan**: buat jadwal rutin mingguan, sesi latihan akan muncul sendiri tiap minggu.",
      ] },
      { t: "tip", text: "Setelah empat langkah itu, undang pelatih lewat **Staf → Undang staf** supaya mereka bisa absen dari HP masing-masing." },
      { t: "h", text: "Masuk setiap hari" },
      { t: "p", text: "Buka sport.saturoom.com/masuk. Isi **ID bisnis**, **Email**, dan **Password**. Baru daftar dan belum punya akademi, atau baru diundang? Kosongkan ID bisnis." },
    ],
  },
  {
    slug: "alur", group: "Mulai", title: "Cara kerja SatuRoom Sport", summary: "Gambaran besar: bagaimana tim, pemain, jadwal, absensi, dan iuran saling terhubung.",
    blocks: [
      { t: "table", head: ["Bagian", "Isinya", "Terhubung ke"], rows: [
        ["Tim", "Kelompok umur atau kelas latihan.", "Pemain, jadwal, pelatih yang memegang, tarif iuran."],
        ["Pemain", "Data atlet dan kontak orang tua/wali.", "Tim, absensi, iuran, rapor, akun pemain."],
        ["Jadwal", "Latihan rutin mingguan, sesi tambahan, dan pertandingan.", "Tim, lokasi, absensi, akun pemain."],
        ["Absensi", "Hadir, Izin, Sakit, Alpa per sesi. Bisa lewat QR.", "Beranda (pemain sering absen), akun pemain."],
        ["Iuran", "Tarif per tim dan tagihan bulanan.", "Pemain aktif, kontak wali, akun pemain."],
        ["Pengumuman dan rapor", "Kabar dan penilaian dari pelatih.", "Akun pemain."],
      ] },
      { t: "h", text: "Tiga jenis pengguna" },
      { t: "list", items: [
        "**Staf akademi**: Pemilik, Admin, Kepala pelatih, Pelatih, Bendahara, atau peran buatan Anda sendiri. Masuk ke aplikasi utama.",
        "**Pemain atau orang tua**: masuk ke **Akun pemain** untuk melihat jadwal, kehadiran, iuran, pengumuman, rapor, dan menunjukkan QR absen.",
        "**Calon pemain**: mengisi formulir pendaftaran lewat link yang Anda bagikan, tanpa perlu akun.",
      ] },
      { t: "warn", text: "Pembayaran iuran tidak diproses di aplikasi. Uang tetap diterima lewat tunai atau transfer biasa; aplikasi mencatat siapa sudah bayar." },
    ],
  },
  {
    slug: "jadwal", group: "Latihan harian", title: "Jadwal latihan", summary: "Jadwal rutin mingguan, sesi tambahan, pertandingan, dan membatalkan latihan.",
    blocks: [
      { t: "h", text: "Jadwal rutin (paling sering dipakai)" },
      { t: "steps", items: [
        "Buka **Jadwal → Jadwal rutin**.",
        "Pilih **tim**, centang **hari** (boleh lebih dari satu), isi **Jam mulai** dan durasi (15–300 menit).",
        "Isi **Mulai berlaku** dan pilih **lokasi** bila ada lebih dari satu.",
        "Klik **Simpan jadwal**. Sesi latihan muncul sendiri setiap minggu.",
      ] },
      { t: "p", text: "Untuk berhenti, klik **Hentikan** lalu **Ya, hentikan**. Sesi yang sudah lewat dan absensinya tetap tersimpan." },
      { t: "h", text: "Sesi tambahan atau pertandingan" },
      { t: "steps", items: [
        "Buka **Jadwal → Tambah sesi**.",
        "Pilih **Latihan** atau **Pertandingan**, isi tanggal dan jam. Judul dan lawan boleh dikosongkan.",
        "Klik **Simpan sesi**.",
      ] },
      { t: "h", text: "Hasil pertandingan" },
      { t: "p", text: "Buka sesi pertandingan. Isi lawan, **Kandang/Tandang/Netral**, skor, catatan, dan susunan **Inti** atau **Cadangan**. Klik **Simpan pertandingan**. Pemain melihat posisinya di akun pemain." },
      { t: "h", text: "Membatalkan latihan" },
      { t: "p", text: "Buka sesinya, klik **Batalkan sesi ini**, isi alasan bila perlu, lalu **Ya, batalkan sesi**. Salah batal? Klik **Batalkan pembatalan**." },
      { t: "warn", text: "Satu lokasi tidak bisa dipakai dua tim di jam yang sama. Aplikasi akan menolak dan menyebut tim yang bentrok." },
      { t: "p", text: "Siapa yang bisa mengatur jadwal: Pemilik, Admin, Kepala pelatih, dan Pelatih untuk tim yang dipegangnya. Bendahara tidak." },
    ],
  },
  {
    slug: "absensi", group: "Latihan harian", title: "Absensi dan QR", summary: "Mengisi kehadiran per sesi dengan sekali ketuk, atau scan QR dari HP pemain.",
    blocks: [
      { t: "h", text: "Absen manual" },
      { t: "steps", items: [
        "Buka **Jadwal** dan pilih sesi hari ini (atau klik **Absen latihan** di Beranda).",
        "Tiap pemain punya pilihan **H** (Hadir), **I** (Izin), **S** (Sakit), **A** (Alpa). Ketuk yang sesuai.",
        "Klik **Simpan**. Muncul **Absen tersimpan**. Bisa diubah lagi kapan saja.",
      ] },
      { t: "h", text: "Absen lewat QR" },
      { t: "steps", items: [
        "Pemain membuka akun pemainnya dan menunjukkan **QR absensi**.",
        "Pelatih membuka sesi lalu klik **Scan QR pemain**, izinkan kamera, arahkan ke QR.",
        "Pemain langsung tercatat **Hadir**.",
      ] },
      { t: "warn", text: "QR berlaku 2 menit dan hanya sekali pakai. Pemain harus aktif dan anggota tim sesi itu." },
      { t: "h", text: "Izin atau sakit dari pemain" },
      { t: "p", text: "Pemain atau orang tua bisa mengirim **Izin** atau **Sakit** dari akun pemain sebelum latihan mulai. Keterangannya muncul di daftar absen pelatih." },
      { t: "tip", text: "Pemain yang beberapa kali berturut-turut tidak hadir muncul di Beranda supaya bisa segera dihubungi." },
    ],
  },
  {
    slug: "tim", group: "Pemain dan tim", title: "Tim", summary: "Membuat tim per kelompok umur dan menentukan pelatihnya.",
    blocks: [
      { t: "steps", items: [
        "Buka **Tim → Buat tim**.",
        "Isi **Nama tim** (harus berbeda dari tim lain). Rentang umur boleh dikosongkan; untuk sepak bola ada pintasan **Pakai kelompok umur PSSI**.",
        "Klik simpan.",
      ] },
      { t: "h", text: "Menentukan pelatih tim" },
      { t: "p", text: "Pelatih tidak dipilih di form tim, tapi di data staf: buka **Staf**, pilih pelatihnya, centang **Tim yang dipegang**. Tim tanpa pelatih tampil dengan tulisan **Belum ada pelatih**." },
      { t: "h", text: "Mengarsipkan tim" },
      { t: "p", text: "Buka **Ubah tim** lalu konfirmasi **Ya, arsipkan**. Riwayat latihan, absensi, dan iuran tetap tersimpan." },
    ],
  },
  {
    slug: "pemain", group: "Pemain dan tim", title: "Pemain dan orang tua", summary: "Menambah pemain, kontak wali, status nonaktif, dan unduh daftar ke Excel.",
    blocks: [
      { t: "steps", items: [
        "Buka **Pemain → Tambah pemain**.",
        "Isi **Nama lengkap**, **Tanggal lahir**, dan **Tim** (boleh lebih dari satu, maksimal 5).",
        "Posisi dan nomor punggung boleh diisi (posisi mengikuti cabang olahraga).",
        "Kontak **orang tua/wali** boleh diisi sekarang atau nanti.",
        "Klik **Simpan pemain**, atau **Simpan dan tambah lagi** untuk memasukkan banyak pemain berturut-turut.",
      ] },
      { t: "h", text: "Siapa melihat kontak orang tua" },
      { t: "p", text: "Nomor HP wali hanya terlihat oleh **Pemilik**, **Admin**, dan **Bendahara** (atau peran buatan yang diberi izin **Lihat kontak orang tua**). Pelatih tidak melihatnya." },
      { t: "h", text: "Pemain berhenti" },
      { t: "p", text: "Buka pemainnya, klik **Nonaktifkan pemain**. Ia hilang dari daftar, absensi, dan tagihan baru, tapi riwayatnya tetap ada. Bisa **Aktifkan lagi** kapan saja (lihat filter **Nonaktif**)." },
      { t: "h", text: "Unduh daftar" },
      { t: "p", text: "Di halaman Pemain klik **Unduh daftar pemain (Excel)**. Isinya mengikuti hak akses Anda." },
    ],
  },
  {
    slug: "pendaftaran", group: "Pemain dan tim", title: "Pendaftaran online", summary: "Link formulir untuk calon pemain, lalu terima atau tolak dari satu layar.",
    blocks: [
      { t: "steps", items: [
        "Buka **Pemain → Pendaftar**.",
        "Klik **Salin link** atau **Bagikan ke WhatsApp**, sebarkan ke calon pemain atau grup orang tua.",
        "Orang tua mengisi nama anak, tanggal lahir, nama dan nomor HP wali, lalu **Kirim pendaftaran**. Tanpa perlu akun.",
        "Pendaftar muncul di halaman Pendaftar. Pilih **Masuk ke tim** lalu **Terima jadi pemain**, atau **Tolak** (alasan boleh diisi).",
      ] },
      { t: "list", items: [
        "**Matikan link** bila pendaftaran ditutup; **Nyalakan lagi** untuk membuka.",
        "**Buat link baru** bila link lama tersebar ke tempat yang salah. Link lama langsung tidak berfungsi.",
      ] },
    ],
  },
  {
    slug: "akun-pemain", group: "Pemain dan tim", title: "Akun pemain dan orang tua", summary: "Mengundang pemain atau orang tua, dan apa saja yang mereka lihat.",
    blocks: [
      { t: "steps", items: [
        "Buka data pemain, bagian **Akun pemain**.",
        "Isi **Email untuk akun pemain** (email orang tua juga boleh), klik **Undang**.",
        "Penerima mendapat email berisi **ID bisnis** dan tombol **Buat akun**. Ia membuat password sendiri, konfirmasi email, lalu klik **Hubungkan akun pemain**.",
        "Untuk pemain di bawah 18 tahun, undangan diterima oleh atau dengan izin orang tua/wali.",
      ] },
      { t: "h", text: "Yang terlihat di akun pemain" },
      { t: "list", items: [
        "**Beranda**: latihan berikutnya, pertandingan dan posisi (inti/cadangan), pengumuman, rapor, dan **QR absensi**.",
        "**Jadwal**: dua minggu ke depan. Bisa kirim **Izin** atau **Sakit**.",
        "**Hadir**: persentase kehadiran 60 hari terakhir.",
        "**Iuran**: status tagihan tiap bulan.",
        "**Profil**: data diri (perubahan lewat admin akademi).",
      ] },
      { t: "p", text: "Satu pemain memakai satu akun. Ingin ganti email? Klik **Putuskan**, lalu undang email baru." },
    ],
  },
  {
    slug: "iuran", group: "Uang dan kabar", title: "Iuran bulanan", summary: "Atur tarif per tim, buat tagihan sebulan sekali klik, dan catat pembayaran.",
    blocks: [
      { t: "steps", items: [
        "Buka **Iuran**. Isi **Tarif per tim** (misal 150.000).",
        "Klik **Buat tagihan** untuk bulan ini. Semua pemain aktif di tim bertarif langsung tertagih.",
        "Saat orang tua membayar, klik **Tandai lunas** dan pilih **Tunai**, **Transfer**, atau **Lainnya**.",
        "Untuk mengingatkan, klik **Ingatkan**: WhatsApp terbuka dengan pesan siap kirim.",
      ] },
      { t: "h", text: "Aturan penting" },
      { t: "list", items: [
        "Tagihan bisa dibuat untuk bulan lalu, bulan ini, atau bulan depan.",
        "Pemain di beberapa tim ditagih sekali dengan tarif tertinggi.",
        "Klik lagi **Buat tagihan yang kurang** untuk pemain baru; tagihan lama tidak dobel.",
        "Mengubah tarif tidak mengubah tagihan yang sudah dibuat. Pakai **Ubah nominal** untuk satu tagihan.",
        "**Bebaskan bulan ini** untuk beasiswa atau libur; **Batalkan lunas** bila salah tandai.",
      ] },
      { t: "p", text: "Unduh rekap dengan **Unduh iuran (Excel)**. Yang bisa melihat iuran: Pemilik, Admin, Bendahara." },
    ],
  },
  {
    slug: "pengumuman-rapor", group: "Uang dan kabar", title: "Pengumuman dan rapor", summary: "Kabar untuk pemain dan penilaian perkembangan dari pelatih.",
    blocks: [
      { t: "h", text: "Pengumuman" },
      { t: "steps", items: [
        "Buka **Pengumuman**, isi **Judul** dan isi kabar.",
        "Pilih **Untuk siapa**: seluruh akademi atau satu tim.",
        "Klik **Kirim pengumuman**. Muncul di akun pemain, dan bisa **Bagikan ke WhatsApp**.",
      ] },
      { t: "p", text: "Pelatih bisa mengirim pengumuman untuk tim yang dipegangnya." },
      { t: "h", text: "Rapor pemain" },
      { t: "steps", items: [
        "Buka data pemain, klik **Tulis rapor**.",
        "Isi **Periode** (misal Semester 1 2026), beri nilai 1–5 untuk Teknik, Pemahaman bermain, Fisik, dan Sikap.",
        "Isi **Yang sudah bagus** dan **Yang perlu dilatih**.",
        "**Simpan draf** dulu, atau **Kirim** bila sudah final. Rapor terkirim muncul di akun pemain dan tidak bisa diubah.",
      ] },
    ],
  },
  {
    slug: "staf", group: "Akademi dan staf", title: "Staf, peran, dan izin", summary: "Mengundang pelatih, peran bawaan, membuat peran sendiri, dan jejak aktivitas.",
    blocks: [
      { t: "h", text: "Mengundang staf" },
      { t: "steps", items: [
        "Buka **Staf → Undang staf**.",
        "Isi email, pilih **Peran** (boleh lebih dari satu), dan untuk pelatih centang **Tim yang dipegang**.",
        "Klik **Kirim undangan**.",
        "Staf menerima email berisi **ID bisnis**, tombol **Buat akun dan terima undangan**, dan tautan **Masuk**.",
        "Ia membuat akun dengan email itu dan password pilihannya sendiri, konfirmasi email, lalu klik terima. Akses langsung aktif.",
      ] },
      { t: "warn", text: "Undangan berlaku 14 hari. Akun harus memakai email yang sama dengan undangan." },
      { t: "h", text: "Peran bawaan" },
      { t: "table", head: ["Peran", "Bisa apa"], rows: [
        ["Pemilik", "Semua, termasuk mengatur Pemilik lain dan profil akademi."],
        ["Admin", "Staf, tim, pemain, kontak wali, jadwal, absensi, iuran, pengumuman, lokasi, jejak aktivitas."],
        ["Kepala pelatih", "Semua tim, pemain, jadwal, absensi, dan semua rapor. Tanpa iuran dan kontak wali."],
        ["Pelatih", "Hanya tim yang dipegang: jadwal, absensi (termasuk QR), pertandingan, pengumuman tim, rapor."],
        ["Bendahara", "Iuran dan kontak orang tua untuk penagihan. Tanpa jadwal dan absensi."],
      ] },
      { t: "h", text: "Membuat peran sendiri" },
      { t: "steps", items: [
        "Buka **Staf → Peran dan izin** (khusus Pemilik).",
        "Klik **Peran baru**, atau **Pakai contoh** seperti Asisten pelatih, Admin pendaftaran, Kasir iuran.",
        "Isi nama, centang izin per kelompok (ada **Pilih semua**), klik **Simpan peran**.",
        "Pasang peran itu saat mengundang atau mengubah staf.",
      ] },
      { t: "list", items: [
        "Peran buatan digabung dengan peran bawaan: izinnya dijumlahkan.",
        "Tanpa izin \"semua\" (misal **Lihat semua pemain**), staf hanya melihat tim yang dipegangnya.",
        "Anda tidak bisa memberi izin yang tidak Anda miliki.",
        "Menghapus peran langsung mencabut izinnya dari semua staf yang memakainya.",
      ] },
      { t: "h", text: "Menonaktifkan staf" },
      { t: "p", text: "Buka stafnya, klik **Nonaktifkan akses**. Aksesnya langsung tertutup, riwayatnya tetap. Akademi selalu harus punya minimal satu Pemilik." },
      { t: "h", text: "Jejak aktivitas" },
      { t: "p", text: "Menu **Jejak aktivitas** mencatat siapa melakukan apa dan kapan: pemain ditambah, iuran ditandai lunas, peran diubah, dan lainnya. Bisa disaring per jenis. Catatan tidak bisa diubah atau dihapus." },
    ],
  },
  {
    slug: "pengaturan", group: "Akademi dan staf", title: "Pengaturan akademi", summary: "Logo, nama, kota, alamat, cabang olahraga, lokasi latihan, dan beberapa akademi.",
    blocks: [
      { t: "list", items: [
        "**Logo akademi**: klik **Pilih logo** atau **Ganti logo**. Tersimpan otomatis dan tampil di menu dan Beranda.",
        "**Nama akademi**, **Kota**, **Alamat lengkap**: klik **Simpan perubahan**.",
        "**Cabang olahraga**: hanya bisa diganti selama belum ada pemain.",
        "**Lokasi**: tambah lapangan atau GOR lain. Lokasi utama tidak bisa diarsipkan; lokasi yang masih dipakai jadwal harus dipindah dulu.",
      ] },
      { t: "h", text: "Punya beberapa akademi" },
      { t: "p", text: "Klik nama akademi di kiri atas lalu pilih akademi lain, atau **Buat akademi lain**. Data tiap akademi terpisah penuh. Saat masuk, isi ID bisnis akademi yang ingin dibuka." },
      { t: "h", text: "Keluar" },
      { t: "p", text: "Klik lingkaran inisial di kanan atas, lalu **Keluar**." },
      { t: "h", text: "Di HP" },
      { t: "p", text: "Menu bawah berisi menu utama. Menu lain (Tim, Staf, Peran, Jejak aktivitas, Lokasi, Panduan) dibuka dari **Pengaturan**." },
    ],
  },
  {
    slug: "masalah", group: "Bantuan", title: "Pemecahan masalah", summary: "Pesan yang sering muncul, penyebabnya, dan cara memperbaikinya.",
    blocks: [
      { t: "h", text: "Masuk dan akun" },
      { t: "fix", items: [
        { problem: "ID bisnis, email, atau password salah.", cause: "Salah satu isian keliru, atau ID bisnis diisi padahal akun belum tergabung ke akademi.", fix: "Cek ID bisnis di email undangan atau Beranda (tanda strip boleh dipakai atau tidak). Baru daftar atau baru diundang? Kosongkan ID bisnis. Lupa password? Klik **Lupa password?**." },
        { problem: "Terlalu banyak percobaan masuk.", cause: "Demi keamanan, percobaan masuk dibatasi (8 kali per email per 15 menit).", fix: "Tunggu 15 menit lalu coba lagi, atau atur ulang password." },
        { problem: "Email konfirmasi atau undangan tidak datang.", cause: "Masuk ke folder spam/promosi, atau salah ketik email.", fix: "Cek folder spam. Minta admin akademi mengecek email di **Staf → Menunggu diterima**, batalkan, lalu undang ulang dengan email yang benar." },
        { problem: "Konfirmasi email Anda dulu lewat link yang kami kirim, lalu buka undangannya lagi.", cause: "Undangan hanya terlihat setelah email terbukti milik Anda.", fix: "Buka email konfirmasi dari SatuRoom, klik tombolnya, lalu buka halaman undangan lagi." },
        { problem: "Undangan tidak muncul setelah masuk.", cause: "Akun dibuat dengan email berbeda dari email undangan, atau undangan sudah lewat 14 hari / dibatalkan.", fix: "Masuk dengan email yang menerima undangan. Bila kedaluwarsa, minta admin mengundang ulang." },
        { problem: "Pilih atau buat akademi dulu.", cause: "Akun belum terhubung ke akademi mana pun.", fix: "Buat akademi di halaman **Mulai**, atau terima undangan dari akademi Anda." },
      ] },
      { t: "h", text: "Akses dan staf" },
      { t: "fix", items: [
        { problem: "Anda belum punya akses untuk tindakan ini. Minta pemilik akademi memberi izin.", cause: "Peran Anda tidak punya izin untuk aksi itu.", fix: "Minta Pemilik menambah peran atau izin di **Staf** atau **Peran dan izin**." },
        { problem: "Anda hanya bisa memberi izin yang Anda miliki sendiri.", cause: "Mencoba memberi staf peran yang izinnya melebihi milik Anda.", fix: "Minta Pemilik yang memasang peran tersebut." },
        { problem: "Akademi harus punya minimal satu Pemilik.", cause: "Mencabut peran Pemilik atau menonaktifkan Pemilik terakhir.", fix: "Jadikan orang lain Pemilik dulu, baru ubah peran Anda." },
        { problem: "Orang ini sudah menjadi staf.", cause: "Email itu sudah aktif di akademi.", fix: "Ubah perannya lewat **Staf** dan pilih namanya." },
        { problem: "Pelatih tidak melihat timnya.", cause: "Tim belum dicentang di **Tim yang dipegang**.", fix: "Buka **Staf**, pilih pelatihnya, centang timnya, simpan." },
      ] },
      { t: "h", text: "Latihan dan absensi" },
      { t: "fix", items: [
        { problem: "Absensi bisa diisi mulai hari latihan.", cause: "Sesinya masih di masa depan.", fix: "Isi absen pada hari latihan." },
        { problem: "QR tidak valid atau sudah kedaluwarsa.", cause: "QR lebih dari 2 menit, sudah dipakai, atau pemain bukan anggota tim sesi itu.", fix: "Minta pemain klik **Buat QR baru**. Bila tetap gagal, cek tim pemain atau absen manual." },
        { problem: "Kamera tidak terbuka saat scan QR.", cause: "Izin kamera di browser ditolak.", fix: "Izinkan kamera di pengaturan browser untuk sport.saturoom.com, lalu muat ulang halaman." },
        { problem: "Lokasi sudah dipakai tim lain pada hari dan jam itu.", cause: "Jadwal bentrok di lokasi yang sama.", fix: "Pilih jam atau lokasi lain." },
        { problem: "Latihan sudah mulai. Hubungi pelatih langsung.", cause: "Izin/sakit hanya bisa dikirim sebelum latihan mulai dan sebelum absen diisi.", fix: "Hubungi pelatih langsung; pelatih bisa mengubah absen menjadi Izin atau Sakit." },
      ] },
      { t: "h", text: "Pemain, tim, dan iuran" },
      { t: "fix", items: [
        { problem: "Cabang olahraga tidak bisa diganti setelah ada pemain.", cause: "Posisi pemain bergantung pada cabang.", fix: "Pilih cabang dengan benar sejak awal. Butuh cabang lain? Buat akademi lain." },
        { problem: "Nama tim sudah dipakai.", cause: "Ada tim lain dengan nama sama.", fix: "Pakai nama berbeda, misal tambahkan tahun atau kelas." },
        { problem: "Pemain tidak ikut tertagih.", cause: "Pemain nonaktif, timnya diarsipkan, atau tim belum punya tarif.", fix: "Aktifkan pemain atau isi tarif tim, lalu klik **Buat tagihan yang kurang**." },
        { problem: "Tagihan yang sudah lunas tidak bisa diubah nominalnya.", cause: "Melindungi catatan pembayaran.", fix: "Klik **Batalkan lunas**, ubah nominal, lalu tandai lunas lagi." },
        { problem: "Pemain ini sudah punya akun.", cause: "Satu pemain hanya satu akun.", fix: "Klik **Putuskan** di bagian Akun pemain, lalu undang email baru." },
        { problem: "Pendaftaran ini sudah ditutup.", cause: "Link dimatikan atau sudah diganti.", fix: "Di **Pemain → Pendaftar**, klik **Nyalakan lagi** atau bagikan link terbaru." },
      ] },
      { t: "h", text: "Logo dan tampilan" },
      { t: "fix", items: [
        { problem: "Upload gambar belum diaktifkan.", cause: "Penyimpanan gambar belum disiapkan di server.", fix: "Hubungi admin SatuRoom. Sementara itu, akademi tetap bisa dipakai tanpa logo." },
        { problem: "Pakai gambar JPG, PNG, atau WebP / Ukuran gambar maksimal 5 MB.", cause: "Format atau ukuran file tidak didukung.", fix: "Simpan ulang logo sebagai PNG atau JPG di bawah 5 MB (bisa lewat screenshot)." },
        { problem: "Terjadi gangguan di server. Data Anda aman.", cause: "Gangguan sesaat.", fix: "Tunggu sebentar lalu coba lagi. Bila terus terjadi, hubungi admin SatuRoom dan sebutkan jam kejadian." },
      ] },
    ],
  },
  {
    slug: "pertanyaan", group: "Bantuan", title: "Pertanyaan umum", summary: "Jawaban singkat untuk hal yang sering ditanyakan.",
    blocks: [
      { t: "table", head: ["Pertanyaan", "Jawaban"], rows: [
        ["Apakah gratis?", "Bisa dicoba gratis. Info paket menyusul dari tim SatuRoom."],
        ["Bisa dipakai di HP?", "Bisa. Tampilan menyesuaikan HP, tablet, dan komputer. Cukup buka lewat browser."],
        ["Apakah orang tua bisa membayar lewat aplikasi?", "Belum. Pembayaran lewat tunai atau transfer biasa, lalu staf menandai lunas."],
        ["Data akademi saya aman?", "Data tiap akademi terpisah dan hanya terlihat oleh anggota akademi itu, sesuai perannya."],
        ["Satu orang mengurus dua akademi?", "Bisa. Pindah lewat nama akademi di kiri atas."],
        ["Pelatih ganti tiap musim?", "Ubah **Tim yang dipegang** di data staf, atau nonaktifkan pelatih lama."],
        ["Bisa untuk renang atau bulu tangkis?", "Bisa. Pilih cabangnya saat membuat akademi; tim bisa dipakai sebagai kelas atau kelompok latihan."],
      ] },
    ],
  },
];

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug);
