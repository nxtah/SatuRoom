import { Banknote, BookOpen, ChefHat, ClipboardList, Package, ShoppingBasket, Store, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RasaPreview } from "@/components/landing-preview";
import { LogoMark, Maskot } from "@/components/maskot";

export const metadata: Metadata = {
  title: { absolute: "SatuRoom Rasa: kasir, dapur, dan stok untuk usaha makanan" },
  description: "Kasir, layar dapur, stok yang terpotong otomatis, pembelian, dan laporan harian untuk kafe, warung, dan resto kecil.",
  robots: { index: true, follow: true },
};

const MARQUEE = ["Kasir", "Dapur", "Stok", "Pembelian", "Kas", "Menu", "Laporan"];

const FEATURES = [
  { icon: Store, title: "Kasir yang cepat", body: "Pilih menu, total dihitung otomatis, lalu catat pembayaran tunai, transfer, QRIS, atau kartu.", tone: "bg-saffron text-kitchen", span: "sm:col-span-2" },
  { icon: ChefHat, title: "Dapur langsung tahu", body: "Pesanan muncul di layar dapur begitu dikirim. Koki menandai mulai dan siap.", tone: "bg-kitchen text-white", span: "" },
  { icon: Package, title: "Stok terpotong sendiri", body: "Resep memotong bahan di tiap pesanan. Bahan yang hampir habis ditandai.", tone: "bg-basil text-white", span: "" },
  { icon: ShoppingBasket, title: "Pembelian dan pemasok", body: "Catat belanja bahan; stok dan harga rata-rata ikut diperbarui.", tone: "bg-white text-kitchen", span: "" },
  { icon: Banknote, title: "Kas dan shift", body: "Buka dan tutup shift, lihat uang di laci dan selisihnya.", tone: "bg-white text-kitchen", span: "" },
  { icon: TrendingUp, title: "Laporan harian", body: "Penjualan, metode bayar, menu terlaris, food cost, dan pembayaran yang dibatalkan, tanpa menghitung ulang.", tone: "bg-kitchen-2 text-white", span: "sm:col-span-2" },
] as const;

const FLOW = [
  [ClipboardList, "Pesanan masuk", "Kasir atau pelayan memilih menu di POS."],
  [ChefHat, "Dapur menyiapkan", "Layar dapur menampilkan pesanan, koki menandai siap."],
  [Package, "Stok berkurang", "Bahan terpotong sesuai resep, otomatis."],
  [BookOpen, "Laporan terisi", "Penjualan dan food cost hari ini sudah tercatat."],
] as const;

export default function RasaLanding() {
  return (
    <div className="scroll-page overflow-x-clip bg-plate">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
        <nav aria-label="Navigasi utama" className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-orange-950/10 bg-plate/95 px-2 pl-3 backdrop-blur-md sm:h-16 sm:px-3 sm:pl-4">
          <Link href="/selamat-datang" className="flex items-center gap-2 rounded-full">
            <LogoMark className="h-8 sm:h-9" />
            <span className="text-lg font-extrabold tracking-tight text-kitchen sm:text-xl">SatuRoom</span>
            <span className="hidden rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-bold text-kitchen sm:inline">Rasa</span>
          </Link>
          <ul className="mx-auto hidden items-center gap-1 lg:flex">
            {[["Fitur", "#fitur"], ["Alur", "#alur"], ["Tampilan", "#tampilan"], ["Tanya jawab", "#tanya"]].map(([l, h]) => (
              <li key={h}><a href={h} className="rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-white hover:text-kitchen">{l}</a></li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href="/masuk" className="rounded-full px-3 py-2 text-sm font-bold text-kitchen transition hover:bg-white sm:px-4">Masuk</Link>
            <Link href="/daftar" className="whitespace-nowrap rounded-full bg-kitchen px-4 py-2.5 text-sm font-bold text-white transition hover:bg-kitchen-2 active:scale-[0.97] sm:px-5">Coba gratis</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div className="relative mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-kitchen px-5 pt-32 pb-24 text-white sm:rounded-[2.75rem] sm:px-10 sm:pt-44 sm:pb-32">
            <div aria-hidden className="logo-sweep pointer-events-none absolute -top-10 -right-24 w-[24rem] sm:-right-10 sm:w-[36rem] lg:right-[6%]">
              <LogoMark className="absolute inset-0 h-full w-full scale-110 opacity-60 blur-3xl" />
              <LogoMark className="relative h-auto w-full rotate-[-12deg] opacity-90" />
            </div>
            <div className="relative mx-auto grid max-w-6xl items-end gap-10 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h1 className="rise text-[2.8rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance sm:text-7xl md:text-6xl lg:text-[5.4rem]">Dari pesanan masuk sampai dapur siap, tetap rapi.</h1>
                <p className="rise mt-7 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">Kasir, dapur, stok, dan laporan harian terhubung untuk kafe, warung, dan resto kecil.</p>
                <div className="rise mt-10 flex flex-wrap items-center gap-3">
                  <Link href="/daftar" className="rounded-full bg-saffron px-8 py-4 text-base font-bold text-kitchen transition hover:-translate-y-0.5 hover:bg-white active:scale-[0.98]">Daftarkan usaha</Link>
                  <Link href="/masuk" className="rounded-full bg-white/12 px-7 py-4 text-base font-bold text-white transition hover:bg-white/20">Sudah punya akun? Masuk</Link>
                </div>
              </div>
              <div aria-hidden className="pop relative mx-auto w-60 sm:w-80 md:w-72 lg:w-[24rem]"><Maskot priority className="maskot-float drop-shadow-maskot" /></div>
            </div>
          </div>
        </section>

        <div aria-hidden className="mt-16 overflow-hidden py-4 lg:mt-24">
          <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap text-5xl font-extrabold tracking-tight sm:text-7xl">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-8">
                {MARQUEE.map((w, i) => (
                  <span key={`${k}-${w}`} className="flex items-center gap-8">
                    <span className={i % 3 === 0 ? "text-tomato" : i % 3 === 1 ? "text-kitchen" : "text-kitchen/20"}>{w}</span>
                    <LogoMark className="h-8 sm:h-11" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="sr-only">Kasir, dapur, stok, pembelian, kas, menu, dan laporan.</p>

        <section id="fitur" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-3xl text-4xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-6xl">Semua yang dipakai di dapur dan di kasir.</h2>
            <ul className="mt-12 grid gap-3 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body, tone, span }) => (
                <li key={title} className={`reveal group rounded-[2rem] p-6 transition duration-300 hover:-translate-y-1 sm:p-8 ${tone} ${span}`}>
                  <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-black/10 transition group-hover:rotate-6"><Icon className="size-6" /></span>
                  <h3 className="mt-6 text-2xl font-extrabold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-md text-base leading-relaxed opacity-80">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="alur" className="scroll-mt-24 bg-kitchen px-4 py-20 text-white sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-2xl text-4xl leading-[1.04] font-extrabold tracking-tight sm:text-5xl">Satu pesanan, empat hal ikut berubah.</h2>
            <ol className="mt-12 grid gap-4 md:grid-cols-4">
              {FLOW.map(([Icon, title, body], i) => (
                <li key={title} className="reveal relative rounded-[1.75rem] bg-kitchen-2 p-6">
                  <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-saffron text-kitchen"><Icon className="size-5" /></span>
                  <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
                  <p className="mt-2 text-white/70">{body}</p>
                  <span aria-hidden className="absolute top-5 right-5 text-3xl font-extrabold text-white/15">{i + 1}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tampilan" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="reveal text-4xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-5xl">Penjualan terbaca sekilas.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-stone-600">Penjualan hari ini, tren 7 hari, menu terlaris, dan jam paling ramai tampil sebagai grafik. Di samping ini contoh tampilan dengan data fiktif.</p>
            </div>
            <div className="panel-rise"><RasaPreview /></div>
          </div>
        </section>

        <section id="tanya" className="scroll-mt-24 px-4 pb-20 sm:px-6 lg:pb-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="reveal text-4xl leading-[1.04] font-extrabold tracking-tight sm:text-5xl">Yang sering ditanyakan.</h2>
            <div className="grid gap-3">
              {[
                ["Apa itu ID bisnis?", "Kode 8 karakter milik usaha Anda, tampil di halaman Ringkasan. Saat masuk, Anda mengetik ID bisnis, email, dan password. Ini memastikan pemilik beberapa usaha selalu membuka usaha yang benar."],
                ["Perlu install aplikasi?", "Tidak. Buka lewat browser HP, tablet, atau komputer kasir."],
                ["Apakah Rasa memproses pembayaran pelanggan?", "Tidak. Rasa mencatat pembayaran tunai, transfer, QRIS, atau kartu yang Anda terima. Uangnya tidak melewati SatuRoom."],
                ["Satu akun untuk Bola dan Rasa?", "Bisa. Email dan password yang sama, dengan ID bisnis yang berbeda untuk tiap usaha."],
              ].map(([q, a]) => (
                <details key={q} className="reveal group rounded-[1.5rem] bg-white p-5 open:bg-saffron/15">
                  <summary className="cursor-pointer list-none text-lg font-extrabold [&::-webkit-details-marker]:hidden">{q}</summary>
                  <p className="mt-3 max-w-2xl text-stone-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden rounded-[2rem] bg-saffron px-6 pt-14 text-center text-kitchen sm:pt-20">
            <h2 className="reveal relative max-w-2xl text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">Mulai rapikan usahamu minggu ini.</h2>
            <Link href="/daftar" className="relative mt-8 rounded-full bg-kitchen px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-kitchen-2">Daftarkan usaha gratis</Link>
            <div className="relative mt-10 w-48 sm:w-64"><Maskot className="drop-shadow-maskot" /></div>
          </div>
        </section>
      </main>

      <footer className="px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-night px-5 pt-14 text-white sm:rounded-[2.75rem] sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8">
            <p className="max-w-xs text-white/70">SatuRoom Rasa, aplikasi usaha makanan dan minuman dari SatuRoom.</p>
            <nav aria-label="Pintasan" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold">
              <Link href="/masuk" className="hover:text-saffron">Masuk</Link>
              <Link href="/daftar" className="hover:text-saffron">Daftar</Link>
              <a href="https://saturoom.com" className="hover:text-white/70">saturoom.com</a>
              <a href="https://bola.saturoom.com" className="hover:text-white/70">SatuRoom Bola</a>
            </nav>
          </div>
          <div aria-hidden className="word-in mx-auto mt-14 mb-4 flex max-w-6xl items-end gap-[2vw]">
            <LogoMark className="h-[16vw] max-h-52 shrink-0" />
            <span className="text-[17vw] leading-[0.78] font-extrabold tracking-[-0.05em] text-white/90 xl:text-[14rem]">Rasa</span>
          </div>
          <p className="mx-auto max-w-6xl py-6 text-sm text-white/50">© {new Date().getFullYear()} SatuRoom</p>
        </div>
      </footer>
    </div>
  );
}
