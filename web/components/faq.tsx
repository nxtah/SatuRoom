import { Plus } from "lucide-react";

const ITEMS = [
  {
    q: "Perlu install aplikasi di HP?",
    a: "Tidak. SatuRoom dibuka dari browser HP atau laptop. Kalau mau, tambahkan ke layar utama HP supaya terasa seperti aplikasi.",
  },
  {
    q: "Satu akun bisa untuk Bola dan Rasa?",
    a: "Bisa. Daftar sekali dengan Google atau email, lalu masuk ke aplikasi mana pun. Sesi masuknya terpisah, jadi tiap aplikasi perlu dibuka dan dimasuki sekali.",
  },
  {
    q: "Pelatih atau kasir saya tidak terbiasa pakai aplikasi. Bisa?",
    a: "Bisa. Pelatih cukup menekan Hadir, Izin, Sakit, atau Alpa di tiap nama. Kasir memilih menu lalu menerima pembayaran. Hampir tidak ada yang perlu diketik.",
  },
  {
    q: "Apakah data pemain dan orang tua aman?",
    a: "Data tiap akademi terpisah dan tidak bisa dibuka akademi lain. Kontak orang tua hanya terlihat oleh peran yang berhak. Kami hanya meminta data yang diperlukan untuk mengurus akademi.",
  },
  {
    q: "Rasa memproses pembayaran pelanggan?",
    a: "Tidak. Rasa mencatat pembayaran tunai, transfer, QRIS, dan kartu yang Anda terima, lalu menghitung kas dan laporan harian. Uangnya tidak melewati SatuRoom.",
  },
  {
    q: "Usaha saya punya lebih dari satu lokasi.",
    a: "Versi pertama fokus pada satu lokasi. Pengaturan banyak cabang sedang disiapkan dan bisa ditambahkan tanpa memindahkan data.",
  },
  {
    q: "Orang tua bisa login untuk melihat anaknya?",
    a: "Pemain yang diundang akademi punya akun sendiri untuk melihat jadwal, kehadiran, iuran, pengumuman, dan rapor. Persetujuan orang tua dicatat saat undangan diterima. Akun terpisah khusus orang tua belum ada.",
  },
];

export function Faq() {
  return (
    <div className="grid gap-3">
      {ITEMS.map((item) => (
        <details
          key={item.q}
          className="group rounded-[1.5rem] border border-line bg-chalk transition-colors open:border-pitch/20 open:bg-mist hover:border-pitch/25"
        >
          <summary className="flex cursor-pointer list-none items-center gap-4 p-5 text-left font-display text-lg font-extrabold sm:p-6 sm:text-xl [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{item.q}</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mist transition-transform duration-300 group-open:rotate-45 group-open:bg-ember">
              <Plus aria-hidden className="size-5" />
            </span>
          </summary>
          <p className="max-w-2xl px-5 pb-6 text-base leading-relaxed text-ink-soft sm:px-6">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
