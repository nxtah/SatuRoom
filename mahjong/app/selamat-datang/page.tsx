import { Armchair, CalendarClock, ChartNoAxesColumn, Coffee, Trophy, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LandingFloor } from "@/components/landing-floor";
import { LogoMark, Maskot } from "@/components/maskot";
import { Tile, TileRow, type TileFace } from "@/components/tiles";

export const metadata: Metadata = {
  title: { absolute: "SatuRoom Mahjong: aplikasi rumah mahjong" },
  description: "Papan meja langsung, booking tanpa bentrok, member dengan saldo, pesanan kantin, dan liga mahjong dalam satu aplikasi. Dibuka dari HP, dipakai tanpa pelatihan.",
  robots: { index: true, follow: true },
};

const ROLES: { glyph: string; tone: "red" | "green" | "ink"; role: string; what: string }[] = [
  { glyph: "中", tone: "red", role: "Pemilik", what: "Melihat omzet, mengatur tarif, meja, dan staf." },
  { glyph: "發", tone: "green", role: "Manajer", what: "Menjalankan harian: booking, member, menu, turnamen, laporan." },
  { glyph: "東", tone: "ink", role: "Host", what: "Membuka meja, mencatat pesanan, menerima pembayaran." },
  { glyph: "南", tone: "ink", role: "Pelayan", what: "Hanya mencatat pesanan makanan dan minuman ke meja." },
  { glyph: "西", tone: "ink", role: "Wasit", what: "Mengisi skor turnamen. Tidak melihat uang." },
];

const FEATURES = [
  { icon: Armchair, title: "Lantai langsung", text: "Semua meja dalam satu layar: siapa main, sudah berapa lama, tagihan sementara. Pindah meja tanpa hitung ulang." },
  { icon: CalendarClock, title: "Booking tanpa bentrok", text: "Satu meja tidak bisa dipesan dua kali di jam yang beririsan. Pelanggan bisa kirim permintaan lewat link, staf yang memilihkan meja." },
  { icon: UsersRound, title: "Member dan saldo", text: "Reguler, Silver, Gold dengan diskon otomatis di sewa meja. Isi saldo, bayar dengan saldo, riwayatnya tidak bisa dihapus." },
  { icon: Coffee, title: "Pesanan kantin", text: "Teh, kopi, camilan dicatat ke meja dan masuk tagihan. Stok berkurang sendiri, pesanan yang batal mengembalikan stok." },
  { icon: Trophy, title: "Liga dan turnamen", text: "Daftar peserta, undi meja tiap babak supaya jarang bertemu lawan yang sama, isi skor, klasemen jalan sendiri." },
  { icon: ChartNoAxesColumn, title: "Laporan malam", text: "Omzet per hari, jam ramai, pemakaian tiap meja, cara bayar, menu terlaris, dan member teratas." },
] as const;

const FAQ = [
  ["Tagihan dihitung bagaimana?", "Tarif per jam tiap meja, dibulatkan ke atas per 10, 15, 30, atau 60 menit, dengan minimal sewa yang Anda atur. Diskon member hanya untuk sewa meja, bukan makanan. Tarif dicatat saat meja dibuka, jadi mengubah tarif tidak mengganggu yang sedang main."],
  ["Apa itu ID bisnis?", "Kode 8 karakter milik tempat Anda, tampil di Beranda. Saat masuk, staf mengetik ID bisnis, email, dan password, jadi yang mengelola beberapa tempat selalu membuka tempat yang benar."],
  ["Perlu install aplikasi atau alat khusus?", "Tidak. Buka dari browser HP atau tablet kasir. Tidak ada perangkat tambahan."],
  ["Apakah ada pembayaran online di aplikasi?", "Belum. Aplikasi mencatat pembayaran tunai, QRIS, transfer, dan saldo member yang diterima di tempat. Uang tidak lewat SatuRoom."],
] as const;

const hand: TileFace[] = [{ kind: "dots", n: 1 }, { kind: "bamboo", n: 3 }, { kind: "glyph", text: "中" }, { kind: "dots", n: 8 }, { kind: "glyph", text: "發", tone: "green" }, { kind: "bamboo", n: 8 }, { kind: "glyph", text: "北", tone: "ink" }];

export default function MahjongLanding() {
  return (
    <div className="overflow-x-clip bg-mist">
      <header className="felt sticky top-0 z-30 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/selamat-datang" className="flex items-center gap-2 rounded-xl">
            <LogoMark className="h-8" />
            <span className="text-lg font-extrabold">SatuRoom</span>
            <span className="cjk rounded-md bg-ember px-1.5 py-0.5 text-sm leading-none">麻将</span>
          </Link>
          <nav aria-label="Bagian halaman" className="ml-6 hidden md:block">
            <ul className="flex gap-1">
              {[["#fitur", "Fitur"], ["#peran", "Peran"], ["#struk", "Tagihan"], ["#tanya", "Tanya"]].map(([h, l]) => (
                <li key={h}><a href={h} className="rounded-lg px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">{l}</a></li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/masuk" className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-white/10 sm:px-4">Masuk</Link>
            <Link href="/daftar" className="rounded-xl bg-ember px-4 py-2.5 text-sm font-extrabold whitespace-nowrap shadow-[0_3px_0_var(--color-ember-deep)] active:translate-y-0.5 sm:px-5">Coba gratis</Link>
          </div>
        </div>
      </header>

      <section className="felt relative text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pt-16 lg:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold"><span className="cjk text-base text-sun" aria-hidden>發</span> Untuk rumah mahjong dan klub</p>
            <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-bold text-balance sm:text-6xl lg:text-[4.25rem]">Meja penuh. Kasir tenang.</h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">Dari booking sampai bayar: waktu sewa dihitung sendiri, pesanan teh masuk tagihan, member dapat diskon, liga punya klasemen. Satu aplikasi untuk pemilik, host, pelayan, dan wasit.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/daftar" className="rounded-xl bg-ember px-7 py-4 text-base font-extrabold shadow-[0_4px_0_var(--color-ember-deep)] active:translate-y-[3px]">Daftarkan tempat gratis</Link>
              <Link href="/masuk" className="rounded-xl bg-white/12 px-7 py-4 text-base font-bold hover:bg-white/20">Sudah punya akun? Masuk</Link>
            </div>
            <TileRow faces={hand} className="mt-10 hidden sm:flex" />
          </div>
          <div className="relative">
            <div className="rounded-2xl bg-night/70 p-4 ring-1 ring-white/10 sm:p-5">
              <div className="mb-3 flex items-center justify-between text-xs font-bold text-white/60"><span>Lantai · contoh</span><span className="tnum">Jumat malam</span></div>
              <LandingFloor />
            </div>
            <div aria-hidden className="pointer-events-none absolute -top-7 -right-1 flex gap-1.5 sm:-top-9 sm:right-4">
              <Tile face={{ kind: "glyph", text: "中" }} className="deal w-11 rotate-6 drop-shadow-lg sm:w-14" />
              <Tile face={{ kind: "glyph", text: "發", tone: "green" }} className="deal w-11 -rotate-3 drop-shadow-lg sm:w-14" />
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="display max-w-2xl text-3xl font-bold text-balance sm:text-5xl">Yang dibutuhkan malam Jumat, bukan sekadar kasir.</h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="tile reveal p-6">
              <f.icon aria-hidden className="size-7 text-ember" />
              <h3 className="mt-4 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{f.title}</h3>
              <p className="mt-2 text-ink-soft">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="struk" className="felt scroll-mt-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h2 className="text-3xl font-bold text-balance sm:text-5xl">Tagihan yang bisa dijelaskan ke tamu.</h2>
            <p className="mt-5 max-w-md text-lg text-white/75">Main 1 jam 35 menit di meja per 30 menit dihitung 2 jam. Aturannya tertulis di struk, bukan tebakan kasir. Bayar terpisah tunai dan QRIS pun bisa.</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm rotate-1 bg-chalk p-6 text-ink shadow-[0_6px_0_var(--color-edge),0_30px_50px_-20px_rgb(0_0_0/0.6)]" style={{ clipPath: "polygon(0 0,100% 0,100% calc(100% - 10px),96% 100%,92% calc(100% - 10px),88% 100%,84% calc(100% - 10px),80% 100%,76% calc(100% - 10px),72% 100%,68% calc(100% - 10px),64% 100%,60% calc(100% - 10px),56% 100%,52% calc(100% - 10px),48% 100%,44% calc(100% - 10px),40% 100%,36% calc(100% - 10px),32% 100%,28% calc(100% - 10px),24% 100%,20% calc(100% - 10px),16% 100%,12% calc(100% - 10px),8% 100%,4% calc(100% - 10px),0 100%)" }}>
            <p className="text-center text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Naga Jade Mahjong Club</p>
            <p className="text-center text-xs text-ink-soft">Meja 2 · 19.05-20.40 · Mei Ling (Gold)</p>
            <dl className="tnum mt-5 divide-y divide-dashed divide-line text-sm">
              <div className="flex justify-between py-2"><dt>Sewa 2 jam × Rp40.000</dt><dd>Rp80.000</dd></div>
              <div className="flex justify-between py-2 text-turf"><dt>Diskon Gold 10%</dt><dd>-Rp8.000</dd></div>
              <div className="flex justify-between py-2"><dt>2× Teh tarik</dt><dd>Rp30.000</dd></div>
              <div className="flex justify-between py-2"><dt>1× Kacang goreng</dt><dd>Rp12.000</dd></div>
              <div className="flex justify-between py-3 text-lg font-extrabold"><dt>Total</dt><dd>Rp114.000</dd></div>
              <div className="flex justify-between py-2"><dt>Saldo member</dt><dd>Rp64.000</dd></div>
              <div className="flex justify-between py-2"><dt>QRIS</dt><dd>Rp50.000</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section id="peran" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="max-w-2xl text-3xl font-bold text-balance sm:text-5xl">Lima peran, masing-masing melihat yang perlu saja.</h2>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">Undang staf lewat email dan pilih perannya. Pelayan tidak melihat omzet, wasit tidak melihat uang.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((r, i) => (
            <li key={r.role} className="tile reveal flex flex-col p-5" style={{ ["--i" as string]: i }}>
              <Tile face={{ kind: "glyph", text: r.glyph, tone: r.tone }} className="w-12 -rotate-3" />
              <h3 className="mt-4 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{r.role}</h3>
              <p className="mt-1 text-sm text-ink-soft">{r.what}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="tile grid gap-8 overflow-hidden p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-balance sm:text-4xl">Liga Jumat punya klasemen sendiri.</h2>
            <p className="mt-3 max-w-xl text-ink-soft">Undi meja tiap babak, isi skor empat pemain, poin peringkat dan total skor dihitung otomatis. Wasit cukup membuka HP.</p>
          </div>
          <ol className="tnum w-full min-w-64 divide-y divide-line rounded-xl bg-mist p-2 text-sm lg:w-80">
            {[["Koh Ahong", 14, "112.400"], ["Mei Ling", 12, "108.900"], ["Pak Budi", 9, "97.300"], ["Bu Rina", 7, "91.000"]].map(([n, p, s], i) => (
              <li key={n} className="flex items-center gap-3 px-2 py-2.5"><span className={`grid size-7 place-items-center rounded-lg text-xs font-extrabold ${i === 0 ? "bg-sun" : "bg-chalk"}`}>{i + 1}</span><b className="flex-1">{n}</b><span>{p} poin</span><span className="text-ink-soft">{s}</span></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="tanya" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:pb-24">
        <h2 className="text-3xl font-bold sm:text-4xl">Pertanyaan yang sering muncul</h2>
        <div className="mt-6 grid gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="tile group p-5">
              <summary className="cursor-pointer list-none font-extrabold marker:hidden">{q}</summary>
              <p className="mt-3 text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="felt text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 lg:flex-row lg:text-left">
          <div className="w-28 shrink-0"><Maskot /></div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-balance sm:text-4xl">Buka lantai Anda malam ini.</h2>
            <p className="mt-2 text-white/75">Daftar gratis, empat meja contoh langsung siap. Ubah nama dan tarif sesuai tempat Anda.</p>
          </div>
          <Link href="/daftar" className="rounded-xl bg-ember px-8 py-4 text-base font-extrabold shadow-[0_4px_0_var(--color-ember-deep)] active:translate-y-[3px]">Daftarkan tempat gratis</Link>
        </div>
      </section>

      <footer className="bg-night py-8 text-sm text-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 sm:px-6">
          <span>© SatuRoom</span>
          <Link href="/masuk" className="hover:text-white">Masuk</Link>
          <Link href="/daftar" className="hover:text-white">Daftar</Link>
          <a href="https://saturoom.com" className="hover:text-white">saturoom.com</a>
          <a href="https://sport.saturoom.com" className="hover:text-white">SatuRoom Sport</a>
          <a href="https://rasa.saturoom.com" className="hover:text-white">SatuRoom Rasa</a>
        </div>
      </footer>
    </div>
  );
}
