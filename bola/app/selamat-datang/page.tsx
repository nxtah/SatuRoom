import { CalendarCheck, ClipboardCheck, Link2, Megaphone, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BolaPreview } from "@/components/landing-preview";
import { LogoMark, Maskot } from "@/components/maskot";

export const metadata: Metadata = {
  title: { absolute: "SatuRoom Bola: aplikasi akademi sepak bola" },
  description: "Absensi, jadwal latihan, iuran, rapor pemain, dan pengumuman untuk akademi sepak bola. Dibuka dari HP, dipakai tanpa pelatihan.",
  robots: { index: true, follow: true },
};

const FEATURES = [
  { icon: ClipboardCheck, title: "Absensi dalam hitungan detik", body: "Pelatih menandai hadir, izin, sakit, atau alpa langsung dari HP. Pemain yang alpa berturut-turut ditandai di Beranda.", tone: "bg-ember text-ink", span: "sm:col-span-2" },
  { icon: CalendarCheck, title: "Jadwal per tim", body: "Latihan dan pertandingan mingguan, lengkap dengan jam dan lokasi.", tone: "bg-pitch text-white", span: "" },
  { icon: Wallet, title: "Iuran bulanan", body: "Tagihan per pemain, catat pembayaran, dan lihat siapa yang belum bayar.", tone: "bg-sun text-ink", span: "" },
  { icon: Megaphone, title: "Pengumuman", body: "Kabar untuk seluruh akademi atau satu tim, sampai ke akun pemain.", tone: "bg-chalk text-ink", span: "" },
  { icon: Link2, title: "Tautan pendaftaran", body: "Orang tua mendaftarkan anaknya lewat satu tautan. Pelatih tinggal menyetujui.", tone: "bg-chalk text-ink", span: "" },
  { icon: ShieldCheck, title: "Rapor dan data anak yang terjaga", body: "Pelatih menilai teknik, pemahaman, fisik, dan sikap. Rapor yang dikirim muncul di akun pemain. Data anak minimal dan persetujuan wali tercatat.", tone: "bg-pitch-2 text-white", span: "sm:col-span-2" },
] as const;

const ROLES = [
  ["Pemilik", "Mengatur akademi, tim, staf, dan melihat angka ringkas."],
  ["Kepala pelatih", "Melihat semua pemain dan menilai rapor seluruh tim."],
  ["Pelatih", "Hanya melihat dan mengabsen tim yang dipegang."],
  ["Pemain dan orang tua", "Melihat jadwal, kehadiran, iuran, dan rapor dari akun sendiri."],
] as const;

const STEPS = [
  ["Daftar", "Pakai Google atau email. Tanpa kartu kredit."],
  ["Buat akademi", "Isi nama, tambah tim, lalu pemain. Akademi mendapat ID bisnis untuk masuk."],
  ["Absen di latihan pertama", "Pelatih diundang lewat email, lalu langsung bisa mengabsen."],
] as const;

export default function BolaLanding() {
  return (
    <div className="scroll-page overflow-x-clip bg-chalk">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
        <nav aria-label="Navigasi utama" className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-line bg-chalk/95 px-2 pl-3 backdrop-blur-md sm:h-16 sm:px-3 sm:pl-4">
          <Link href="/selamat-datang" className="flex items-center gap-2 rounded-full">
            <LogoMark className="h-8 sm:h-9" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">SatuRoom</span>
            <span className="hidden rounded-full bg-turf-soft px-2 py-0.5 text-xs font-bold text-pitch sm:inline">Bola</span>
          </Link>
          <ul className="mx-auto hidden items-center gap-1 lg:flex">
            {[["Fitur", "#fitur"], ["Tampilan", "#tampilan"], ["Cara mulai", "#mulai"], ["Tanya jawab", "#tanya"]].map(([l, h]) => (
              <li key={h}><a href={h} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-mist hover:text-ink">{l}</a></li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href="/masuk" className="rounded-full px-3 py-2 text-sm font-bold transition hover:bg-mist sm:px-4">Masuk</Link>
            <Link href="/daftar" className="whitespace-nowrap rounded-full bg-pitch px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pitch-2 active:scale-[0.97] sm:px-5">Coba gratis</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div className="relative mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-pitch px-5 pt-32 pb-24 text-white sm:rounded-[2.75rem] sm:px-10 sm:pt-44 sm:pb-32">
            <svg aria-hidden viewBox="0 0 400 400" className="logo-sweep pointer-events-none absolute -top-24 -right-32 w-[34rem] text-white/[0.07] sm:w-[52rem]">
              <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="6" />
              <circle cx="200" cy="200" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
              <path d="M0 200 H400" stroke="currentColor" strokeWidth="6" />
            </svg>
            <div className="relative mx-auto grid max-w-6xl items-end gap-10 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h1 className="rise font-extrabold text-[2.8rem] leading-[0.98] tracking-[-0.035em] text-balance sm:text-7xl md:text-6xl lg:text-[5.4rem]">
                  Akademi bola rapi, dari HP pelatih.
                </h1>
                <p className="rise mt-7 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
                  Absensi, jadwal, iuran, dan rapor pemain dalam satu aplikasi. Tanpa spreadsheet, tanpa grup yang tenggelam.
                </p>
                <div className="rise mt-10 flex flex-wrap items-center gap-3">
                  <Link href="/daftar" className="rounded-full bg-ember px-8 py-4 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:bg-sun active:scale-[0.98]">Daftarkan akademi</Link>
                  <Link href="/masuk" className="rounded-full bg-white/12 px-7 py-4 text-base font-bold text-white transition hover:bg-white/20">Sudah punya akun? Masuk</Link>
                </div>
              </div>
              <div aria-hidden className="pop relative mx-auto w-60 sm:w-80 md:w-72 lg:w-[24rem]">
                <span className="absolute inset-x-6 bottom-0 top-10 rounded-full bg-pitch-2" />
                <Maskot priority className="maskot-float relative drop-shadow-maskot" />
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-3xl text-4xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-6xl">Yang dipakai setiap hari di akademi.</h2>
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

        <section id="tampilan" className="scroll-mt-24 bg-mist px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="reveal text-4xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-5xl">Angka akademi terbaca sekilas.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">Kehadiran, iuran, dan jumlah pemain tampil sebagai grafik di Beranda. Di samping ini contoh tampilan dengan data fiktif.</p>
              <ul className="mt-8 grid gap-4">
                {ROLES.map(([role, what]) => (
                  <li key={role} className="reveal"><p className="font-extrabold">{role}</p><p className="text-ink-soft">{what}</p></li>
                ))}
              </ul>
            </div>
            <div className="panel-rise"><BolaPreview /></div>
          </div>
        </section>

        <section id="mulai" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-2xl text-4xl leading-[1.04] font-extrabold tracking-tight sm:text-5xl">Siap dipakai di latihan berikutnya.</h2>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="reveal group rounded-[1.75rem] bg-turf-soft p-7 transition duration-300 hover:-translate-y-1">
                  <span className="text-6xl font-extrabold text-turf/40 transition-colors group-hover:text-ember">{i + 1}</span>
                  <h3 className="mt-4 text-2xl font-extrabold">{title}</h3>
                  <p className="mt-2 text-ink-soft">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tanya" className="scroll-mt-24 px-4 pb-20 sm:px-6 lg:pb-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="reveal text-4xl leading-[1.04] font-extrabold tracking-tight sm:text-5xl">Yang sering ditanyakan.</h2>
            <div className="grid gap-3">
              {[
                ["Apa itu ID bisnis?", "Kode 8 karakter milik akademi Anda, tampil di Beranda. Saat masuk, Anda mengetik ID bisnis, email, dan password. Ini memastikan orang yang mengelola beberapa akademi selalu membuka akademi yang benar."],
                ["Perlu install aplikasi?", "Tidak. Buka lewat browser HP, tidak ada yang perlu diunduh."],
                ["Apakah data anak aman?", "Data pemain dibuat seminimal mungkin dan persetujuan orang tua tercatat. Pelatih hanya melihat tim yang mereka pegang, dan kontak orang tua hanya terlihat bagi yang berhak."],
                ["Bagaimana pemain dan orang tua masuk?", "Akademi mengundang lewat email, lalu mereka membuat akun dan masuk dengan ID bisnis akademi."],
              ].map(([q, a]) => (
                <details key={q} className="reveal group rounded-[1.5rem] bg-mist p-5 open:bg-turf-soft">
                  <summary className="cursor-pointer list-none text-lg font-extrabold [&::-webkit-details-marker]:hidden">{q}</summary>
                  <p className="mt-3 max-w-2xl text-ink-soft">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden rounded-[2rem] bg-ember px-6 pt-14 text-center sm:pt-20">
            <h2 className="reveal relative max-w-2xl text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">Mulai rapikan akademi minggu ini.</h2>
            <Link href="/daftar" className="relative mt-8 rounded-full bg-pitch px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-pitch-2">Daftarkan akademi gratis</Link>
            <div className="relative mt-10 w-48 sm:w-64"><Maskot className="drop-shadow-maskot" /></div>
          </div>
        </section>
      </main>

      <footer className="px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-night px-5 pt-14 text-white sm:rounded-[2.75rem] sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8">
            <p className="max-w-xs text-white/70">SatuRoom Bola, aplikasi akademi sepak bola dari SatuRoom.</p>
            <nav aria-label="Pintasan" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold">
              <Link href="/masuk" className="hover:text-ember">Masuk</Link>
              <Link href="/daftar" className="hover:text-ember">Daftar</Link>
              <a href="https://saturoom.com" className="hover:text-white/70">saturoom.com</a>
              <a href="https://rasa.saturoom.com" className="hover:text-white/70">SatuRoom Rasa</a>
            </nav>
          </div>
          <div aria-hidden className="word-in mx-auto mt-14 mb-4 flex max-w-6xl items-end gap-[2vw]">
            <LogoMark className="h-[16vw] max-h-52 shrink-0" />
            <span className="text-[17vw] leading-[0.78] font-extrabold tracking-[-0.05em] text-white/90 xl:text-[14rem]">Bola</span>
          </div>
          <p className="mx-auto max-w-6xl py-6 text-sm text-white/50">© {new Date().getFullYear()} SatuRoom</p>
        </div>
      </footer>
    </div>
  );
}
