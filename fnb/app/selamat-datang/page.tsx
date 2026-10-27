import { Banknote, ChefHat, Package, Store, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Chili, Egg, Leaf, Tomato } from "@/components/ingredients";
import { KitchenBoard, RasaPreview, StockBoard } from "@/components/landing-preview";
import { LogoMark, Maskot } from "@/components/maskot";

export const metadata: Metadata = {
  title: { absolute: "SatuRoom Rasa: kasir, dapur, dan stok untuk usaha makanan" },
  description: "Kasir, layar dapur, stok yang terpotong otomatis, pembelian, dan laporan harian untuk kafe, warung, dan resto kecil.",
  robots: { index: true, follow: true },
};

/* Satu pesanan melewati lima meja kerja. Semua fitur ini ada di aplikasi. */
const FLOW = [
  [Store, "Kasir", "Pilih menu di POS, total dihitung otomatis."],
  [ChefHat, "Dapur", "Pesanan muncul di layar dapur. Koki menandai mulai dan siap."],
  [Banknote, "Bayar", "Catat tunai, transfer, QRIS, atau kartu. Uang laci dan selisih shift terhitung."],
  [Package, "Stok", "Resep memotong bahan di tiap pesanan. Yang hampir habis ditandai."],
  [TrendingUp, "Laporan", "Penjualan, food cost, dan menu terlaris terisi sendiri."],
] as const;

const MENU = [
  ["Kasir cepat", "Dine in, bungkus, ambil", "Pilih menu, total dihitung otomatis, lalu catat pembayaran."],
  ["Layar dapur", "Diperbarui otomatis", "Pesanan muncul begitu dikirim. Koki menandai mulai dan siap."],
  ["Stok dan resep", "Terpotong sendiri", "Isi bahan per porsi agar stok terpotong saat menu terjual."],
  ["Pembelian bahan", "Dari pemasok", "Catat belanja; stok dan harga rata-rata ikut diperbarui."],
  ["Kas dan shift", "Buka dan tutup", "Lihat uang di laci dan selisihnya di akhir shift."],
  ["Laporan harian", "Tanpa hitung ulang", "Penjualan, metode bayar, menu terlaris, food cost, dan pembayaran dibatalkan."],
] as const;

const FAQ = [
  ["Apa itu ID bisnis?", "Kode 8 karakter milik usaha Anda, tampil di halaman Ringkasan. Saat masuk, Anda mengetik ID bisnis, email, dan password, jadi pemilik beberapa usaha selalu membuka usaha yang benar."],
  ["Perlu install aplikasi?", "Tidak. Buka lewat browser HP, tablet, atau komputer kasir."],
  ["Apakah Rasa memproses pembayaran pelanggan?", "Tidak. Rasa mencatat pembayaran tunai, transfer, QRIS, atau kartu yang Anda terima. Uangnya tidak melewati SatuRoom."],
  ["Satu akun untuk Bola dan Rasa?", "Bisa. Email dan password yang sama, dengan ID bisnis yang berbeda untuk tiap usaha."],
] as const;

const NOTA_BG = { ["--nota-bg" as string]: "white" } as React.CSSProperties;

export default function RasaLanding() {
  return (
    <div className="scroll-page overflow-x-clip bg-plate text-kitchen">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
        <nav aria-label="Navigasi utama" className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full bg-white/95 px-2 pl-3 shadow-[0_10px_30px_-18px_rgb(58_37_23/0.5)] backdrop-blur-md sm:h-16 sm:px-3 sm:pl-4">
          <Link href="/selamat-datang" className="flex items-center gap-2 rounded-full">
            <LogoMark className="h-8 sm:h-9" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">SatuRoom</span>
            <span className="hidden rounded-full bg-tomato px-2 py-0.5 text-xs font-bold text-white sm:inline">Rasa</span>
          </Link>
          <ul className="mx-auto hidden items-center gap-1 lg:flex">
            {[["Alur", "#alur"], ["Menu", "#menu"], ["Dapur", "#dapur"], ["Tanya jawab", "#tanya"]].map(([l, h]) => (
              <li key={h}><a href={h} className="rounded-full px-4 py-2 text-sm font-semibold text-kitchen/70 transition hover:bg-cream hover:text-kitchen">{l}</a></li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href="/masuk" className="rounded-full px-3 py-2 text-sm font-bold transition hover:bg-cream sm:px-4">Masuk</Link>
            <Link href="/daftar" className="whitespace-nowrap rounded-full bg-tomato px-4 py-2.5 text-sm font-bold text-white transition hover:bg-chili active:scale-[0.97] sm:px-5">Coba gratis</Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Pembuka: krem hangat, nota pesanan bertumpuk di atas piring mentega. */}
        <section className="relative px-4 pt-28 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="rise font-display text-[3.6rem] leading-[0.95] font-bold tracking-tight text-balance sm:text-[6rem] md:text-[4.6rem] lg:text-[6.4rem]">
                Dapur tenang, <span className="text-tomato italic">kasir lancar.</span>
              </h1>
              <p className="rise mt-6 max-w-lg text-lg leading-relaxed text-kitchen/75 sm:text-xl">
                Kasir, dapur, stok, dan laporan harian terhubung untuk kafe, warung, dan resto kecil.
              </p>
              <div className="rise mt-9 flex flex-wrap items-center gap-3">
                <Link href="/daftar" className="rounded-full bg-tomato px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-chili active:scale-[0.98]">Daftarkan usaha</Link>
                <Link href="/masuk" className="rounded-full bg-cream px-7 py-4 text-base font-bold transition hover:bg-saffron">Sudah punya akun? Masuk</Link>
              </div>
            </div>
            <div aria-hidden className="relative mx-auto aspect-square w-full max-w-md md:max-w-none">
              <span className="absolute inset-[6%] rounded-full bg-saffron" />
              <div className="pop absolute inset-x-[24%] bottom-[2%] w-[52%]"><Maskot priority className="maskot-float drop-shadow-maskot" /></div>
              <div className="nota tilt-in absolute top-[2%] left-[0%] w-[46%] -rotate-[5deg] bg-white p-3 shadow-xl sm:p-4" style={NOTA_BG}>
                <p className="font-display text-xl leading-none font-bold sm:text-2xl">Meja 4</p>
                <p className="mt-2 text-xs leading-snug text-kitchen/75 sm:text-sm">2 Nasi goreng<br />1 Es teh</p>
                <p className="mt-2 inline-block rounded-full bg-tomato px-2 py-0.5 text-[11px] font-bold text-white sm:text-xs">Dimasak</p>
              </div>
              <div className="nota tilt-in absolute top-[24%] right-[0%] w-[40%] rotate-[4deg] bg-cream p-3 shadow-xl sm:p-4" style={{ ["--nota-bg" as string]: "var(--color-cream)" } as React.CSSProperties}>
                <p className="font-display text-xl leading-none font-bold sm:text-2xl">Bungkus</p>
                <p className="mt-2 text-xs leading-snug text-kitchen/75 sm:text-sm">3 Mie ayam</p>
                <p className="mt-2 inline-block rounded-full bg-basil px-2 py-0.5 text-[11px] font-bold text-white sm:text-xs">Siap</p>
              </div>
              <Tomato className="maskot-float absolute top-[58%] left-[2%] w-[15%]" />
              <Chili className="absolute top-[10%] right-[6%] w-[11%] rotate-12" />
              <Leaf className="absolute bottom-[8%] right-[4%] w-[12%] -rotate-12" />
              <Egg className="absolute bottom-[34%] left-[0%] w-[10%] rotate-[-14deg]" />
              <p className="absolute right-[8%] bottom-[0%] rounded-full bg-white px-3 py-1 text-xs font-semibold text-kitchen/70">Contoh tampilan</p>
            </div>
          </div>
        </section>

        {/* Alur satu pesanan. */}
        <section id="alur" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-2xl font-display text-5xl leading-[1] font-bold text-balance sm:text-6xl">Satu pesanan, lima meja kerja.</h2>
            <ol className="relative mt-14 grid gap-4 md:grid-cols-5">
              <span aria-hidden className="absolute top-10 right-8 left-8 hidden border-t-[3px] border-dotted border-kitchen/30 md:block" />
              {FLOW.map(([Icon, title, body], i) => (
                <li key={title} className={`reveal group relative ${i % 2 ? "md:mt-12" : ""}`}>
                  <span aria-hidden className="relative grid size-20 place-items-center rounded-full bg-saffron text-kitchen transition duration-300 group-hover:-translate-y-1 group-hover:bg-tomato group-hover:text-white"><Icon className="size-8" /></span>
                  <h3 className="mt-4 font-display text-3xl font-bold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-kitchen/70">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Daftar fitur dalam bentuk kartu menu cetak. */}
        <section id="menu" className="scroll-mt-20 bg-cream px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="reveal rounded-[2rem] border-[3px] border-kitchen bg-plate p-3 sm:p-4">
              <div className="rounded-[1.5rem] border border-kitchen/40 p-6 sm:p-10">
                <h2 className="text-center font-display text-5xl font-bold italic sm:text-7xl">Menu hari ini</h2>
                <p className="mt-2 text-center text-kitchen/65">Yang bisa dikerjakan SatuRoom Rasa untuk usaha Anda.</p>
                <ul className="mt-10 grid gap-7">
                  {MENU.map(([name, tag, body]) => (
                    <li key={name}>
                      <p className="flex items-baseline gap-3">
                        <span className="font-display text-2xl font-bold sm:text-3xl">{name}</span>
                        <span aria-hidden className="leader" />
                        <span className="text-right text-sm font-bold text-tomato sm:text-base">{tag}</span>
                      </p>
                      <p className="mt-1 max-w-xl leading-relaxed text-kitchen/70">{body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Dapur gelap: layar tiket. */}
        <section id="dapur" className="scroll-mt-20 bg-kitchen px-4 py-20 text-white sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="reveal font-display text-5xl leading-[1] font-bold text-balance sm:text-6xl">Dapur langsung tahu.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">Pesanan muncul di layar dapur begitu kasir mengirimnya. Koki tinggal menandai mulai masak dan siap, tanpa kertas yang hilang di meja.</p>
            </div>
            <div className="panel-rise"><KitchenBoard /></div>
          </div>
        </section>

        {/* Stok: butter. */}
        <section className="bg-saffron px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1"><StockBoard /></div>
            <div className="order-1 lg:order-2">
              <h2 className="reveal font-display text-5xl leading-[1] font-bold text-balance sm:text-6xl">Stok terpotong sendiri.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-kitchen/80">Isi bahan per porsi sekali. Tiap pesanan memotong bahan sesuai resep, dan yang hampir habis ditandai sebelum Anda kehabisan di tengah jam ramai.</p>
            </div>
          </div>
        </section>

        {/* Laporan. */}
        <section className="px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="reveal font-display text-5xl leading-[1] font-bold text-balance sm:text-6xl">Laporan tanpa hitung ulang.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-kitchen/70">Penjualan hari ini, tren 7 hari, menu terlaris, dan jam paling ramai tampil sebagai grafik. Di samping ini contoh dengan data fiktif.</p>
            </div>
            <div className="panel-rise"><RasaPreview /></div>
          </div>
        </section>

        <section id="tanya" className="scroll-mt-20 px-4 pb-20 sm:px-6 lg:pb-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <h2 className="reveal font-display text-5xl leading-[1] font-bold sm:text-6xl">Yang sering ditanyakan.</h2>
            <div className="divide-y-[3px] divide-dotted divide-kitchen/25 border-y-[3px] border-dotted border-kitchen/25">
              {FAQ.map(([q, a]) => (
                <details key={q} className="reveal group py-5">
                  <summary className="cursor-pointer list-none font-display text-2xl font-bold marker:content-none [&::-webkit-details-marker]:hidden">{q}</summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-kitchen/70">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Penutup: kanopi toko di atas meja kasir. */}
        <section className="relative bg-saffron">
          <div aria-hidden className="awning" />
          <div aria-hidden className="awning-edge" />
          <div className="mx-auto grid max-w-6xl items-end gap-4 px-5 pt-14 sm:px-8 md:grid-cols-[1.2fr_0.8fr]">
            <div className="pb-14 sm:pb-24">
              <h2 className="reveal font-display text-[3.4rem] leading-[0.95] font-bold text-balance sm:text-[5.6rem]">Buka kasir hari ini.</h2>
              <Link href="/daftar" className="mt-8 inline-block rounded-full bg-kitchen px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-kitchen-2">Daftarkan usaha gratis</Link>
            </div>
            <div aria-hidden className="mx-auto w-52 self-end sm:w-72"><Maskot className="drop-shadow-maskot" /></div>
          </div>
        </section>
      </main>

      <footer className="bg-night px-5 pt-14 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8">
          <p className="max-w-xs text-white/70">SatuRoom Rasa, aplikasi usaha makanan dan minuman dari SatuRoom.</p>
          <nav aria-label="Pintasan" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold">
            <Link href="/masuk" className="hover:text-saffron">Masuk</Link>
            <Link href="/daftar" className="hover:text-saffron">Daftar</Link>
            <a href="https://saturoom.com" className="hover:text-saffron">saturoom.com</a>
            <a href="https://bola.saturoom.com" className="hover:text-saffron">SatuRoom Bola</a>
          </nav>
        </div>
        <p aria-hidden className="word-in mx-auto mt-10 max-w-6xl font-display text-[30vw] leading-[0.85] font-bold italic text-white/90 sm:text-[22rem]">Rasa</p>
        <p className="mx-auto max-w-6xl py-6 text-sm text-white/50">© {new Date().getFullYear()} SatuRoom</p>
      </footer>
    </div>
  );
}
