import { Plus } from "lucide-react";

const ITEMS = [
  {
    q: "Perlu install aplikasi di HP?",
    a: "Tidak. SatuRoom Bola dibuka dari browser HP atau laptop. Kalau mau, tambahkan ke layar utama HP supaya terasa seperti aplikasi.",
  },
  {
    q: "Pelatih saya tidak terbiasa pakai aplikasi. Bisa?",
    a: "Bisa. Pelatih cukup membuka latihan hari ini lalu menekan Hadir, Izin, Sakit, atau Alpa di tiap nama. Tidak ada yang perlu diketik.",
  },
  {
    q: "Apakah data pemain dan orang tua aman?",
    a: "Data tiap akademi terpisah dan tidak bisa dibuka akademi lain. Kontak orang tua hanya terlihat oleh pemilik dan admin. Kami hanya meminta data yang diperlukan untuk latihan.",
  },
  {
    q: "Akademi saya punya lebih dari satu lapangan atau cabang.",
    a: "Versi pertama fokus pada satu lokasi. Pengaturan banyak cabang sedang disiapkan dan bisa ditambahkan tanpa memindahkan data.",
  },
  {
    q: "Orang tua bisa login untuk melihat anaknya?",
    a: "Belum. Saat ini SatuRoom Bola dipakai oleh pemilik, admin, dan pelatih akademi.",
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
          <summary className="flex cursor-pointer list-none items-center gap-4 p-5 text-left font-display text-lg font-bold sm:p-6 sm:text-xl [&::-webkit-details-marker]:hidden">
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
