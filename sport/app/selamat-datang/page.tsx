import { ArrowUpRight, CalendarCheck, ClipboardCheck, GraduationCap, IdCard, Megaphone, ShieldCheck, Trophy, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BolaPreview } from "@/components/landing-preview";
import { LogoMark, Maskot } from "@/components/maskot";
import { SportIcon } from "@/components/sport-icons";
import { SPORTS } from "@/lib/sports";

export const metadata: Metadata = {
  title: { absolute: "SatuRoom Sport: aplikasi akademi olahraga" },
  description: "Absensi, jadwal latihan, iuran, rapor pemain, dan pengumuman untuk akademi sepak bola, basket, voli, tenis, dan cabang lain. Dibuka dari HP, dipakai tanpa pelatihan.",
  robots: { index: true, follow: true },
};

/* Satu hari latihan, dari jadwal sampai rapor. Isinya fitur yang memang ada di aplikasi. */
const DAY = [
  ["06.30", "Jadwal", "Pelatih membuka jadwal tim. Sesi hari ini, jam, dan lokasinya sudah menunggu. Jam yang bentrok di lokasi sama dicegah otomatis."],
  ["07.00", "Absensi", "Tandai hadir, izin, sakit, atau alpa. Atau scan QR dari akun pemain."],
  ["09.00", "Iuran", "Orang tua membayar tunai atau transfer. Bendahara menandai lunas dan bisa mengingatkan lewat WhatsApp."],
  ["10.00", "Pengumuman", "Latihan digeser? Tulis sekali, kabarnya muncul di akun semua pemain."],
  ["Akhir pekan", "Pertandingan", "Isi lawan, skor, dan susunan pemain inti. Hasilnya muncul di Beranda dan akun pemain."],
  ["Malam", "Rapor", "Pelatih menilai teknik, pemahaman, fisik, dan sikap. Rapor yang dikirim muncul di akun pemain."],
] as const;

const ROLES = [
  { icon: Trophy, role: "Pemilik", what: "Mengatur akademi, tim, staf, dan melihat angka ringkas." },
  { icon: GraduationCap, role: "Kepala pelatih", what: "Melihat semua pemain dan menilai rapor seluruh tim." },
  { icon: ClipboardCheck, role: "Pelatih", what: "Hanya melihat dan mengabsen tim yang dipegang." },
  { icon: IdCard, role: "Pemain dan orang tua", what: "Melihat jadwal, kehadiran, iuran, dan rapor dari akun sendiri." },
] as const;

const FAQ = [
  ["Apa itu ID bisnis?", "Kode 8 karakter milik akademi Anda, tampil di Beranda. Saat masuk, Anda mengetik ID bisnis, email, dan password, jadi yang mengelola beberapa akademi selalu membuka akademi yang benar."],
  ["Perlu install aplikasi?", "Tidak. Buka lewat browser HP, tidak ada yang perlu diunduh."],
  ["Bagaimana pemain dan orang tua masuk?", "Akademi mengundang lewat email, lalu mereka membuat akun dan masuk dengan ID bisnis akademi."],
] as const;

export default function SportLanding() {
  return (
    <div className="scroll-page overflow-x-clip bg-chalk">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
        <nav aria-label="Navigasi utama" className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full bg-pitch/90 px-2 pl-3 text-white ring-1 ring-white/10 backdrop-blur-md sm:h-16 sm:px-3 sm:pl-4">
          <Link href="/selamat-datang" className="flex items-center gap-2 rounded-full">
            <LogoMark className="h-8 sm:h-9" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">SatuRoom</span>
            <span className="hidden rounded-full bg-ember px-2 py-0.5 text-xs font-extrabold text-ink sm:inline">Sport</span>
          </Link>
          <ul className="mx-auto hidden items-center gap-1 lg:flex">
            {[["Cabang", "#cabang"], ["Hari latihan", "#hari"], ["Peran", "#peran"], ["Tampilan", "#tampilan"], ["Tanya jawab", "#tanya"]].map(([l, h]) => (
              <li key={h}><a href={h} className="rounded-full px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">{l}</a></li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href="/masuk" className="rounded-full px-3 py-2 text-sm font-bold transition hover:bg-white/10 sm:px-4">Masuk</Link>
            <Link href="/daftar" className="whitespace-nowrap rounded-full bg-ember px-4 py-2.5 text-sm font-extrabold text-ink transition hover:brightness-110 active:scale-[0.97] sm:px-5">Coba gratis</Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Pembuka: papan skor di atas garis lapangan, potongan miring di bawah. */}
        <section className="relative overflow-hidden bg-pitch text-white [clip-path:polygon(0_0,100%_0,100%_calc(100%-2.5rem),0_100%)] sm:[clip-path:polygon(0_0,100%_0,100%_calc(100%-4.5rem),0_100%)]">
          <svg aria-hidden viewBox="0 0 400 400" className="logo-sweep pointer-events-none absolute -right-40 -bottom-40 w-[36rem] text-white/[0.06] sm:w-[56rem]">
            <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="200" cy="200" r="6" fill="currentColor" />
            <path d="M0 200 H400 M200 0 V400" stroke="currentColor" strokeWidth="5" />
          </svg>
          <span aria-hidden className="pointer-events-none absolute -top-10 right-[-6%] hidden h-[130%] w-10 -rotate-[24deg] bg-ember/90 sm:block sm:w-16 md:right-[8%]" />
          <span aria-hidden className="pointer-events-none absolute -top-10 right-[1%] hidden h-[130%] w-3 -rotate-[24deg] bg-ember/45 sm:block md:right-[2%]" />
          <div className="relative mx-auto grid max-w-6xl items-end gap-6 px-5 pt-32 pb-28 sm:px-8 sm:pt-44 sm:pb-40 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h1 className="rise text-[4.2rem] leading-[0.86] font-extrabold uppercase tracking-tight text-balance sm:text-[7rem] md:text-[6rem] lg:text-[8.5rem]">
                Latihan jalan, <span className="text-ember">akademi rapi.</span>
              </h1>
              <p className="rise mt-7 max-w-lg text-lg leading-relaxed text-white/75 sm:text-xl">
                Absensi, jadwal, iuran, dan rapor pemain dalam satu aplikasi di HP pelatih.
              </p>
              <div className="rise mt-9 flex flex-wrap items-center gap-3">
                <Link href="/daftar" className="rounded-full bg-ember px-8 py-4 text-base font-extrabold text-ink transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]">Daftarkan akademi</Link>
                <Link href="/masuk" className="rounded-full bg-white/12 px-7 py-4 text-base font-bold transition hover:bg-white/20">Sudah punya akun? Masuk</Link>
              </div>
            </div>
            <div aria-hidden className="pop relative mx-auto w-64 sm:w-80 md:w-full md:max-w-sm">
              <Maskot priority className="maskot-float relative drop-shadow-maskot" />
              <div className="absolute -bottom-4 left-0 rotate-[-3deg] rounded-2xl bg-night px-4 py-3 shadow-xl ring-1 ring-white/10 sm:-left-6">
                <p className="text-xs font-semibold text-white/60">Latihan KU 10-13, contoh</p>
                <p className="mt-1 flex gap-4 font-display text-3xl leading-none font-extrabold italic">
                  <span className="text-ember">18 hadir</span><span className="text-white/50">2 izin</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pilihan cabang olahraga. */}
        <section id="cabang" className="scroll-mt-20 px-4 pt-16 sm:px-6 lg:pt-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display italic reveal max-w-3xl text-5xl leading-[0.9] font-extrabold uppercase text-balance sm:text-7xl">Satu aplikasi, banyak cabang.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">Pilih cabang saat mendaftar. Posisi pemain, nama tempat, dan warna aplikasi menyesuaikan, menu intinya sama.</p>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SPORTS.map((s) => (
                <li key={s.id} className="reveal flex flex-col items-start gap-3 rounded-[1.5rem] bg-mist p-5">
                  <span aria-hidden className="grid size-14 place-items-center rounded-2xl text-ink" style={{ background: s.accent }}><SportIcon sport={s.id} className="size-8" /></span>
                  <span className="font-extrabold">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Garis waktu satu hari latihan. */}
        <section id="hari" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display italic reveal text-6xl leading-[0.9] font-extrabold uppercase text-balance sm:text-8xl">Satu hari latihan.</h2>
              <p className="mt-5 max-w-sm text-lg leading-relaxed text-ink-soft">Dari jadwal pagi sampai rapor malam, semuanya dikerjakan di tempat yang sama.</p>
            </div>
            <ol className="relative grid gap-3 before:absolute before:top-4 before:bottom-4 before:left-[5.425rem] before:w-px before:bg-line">
              {DAY.map(([time, title, body]) => (
                <li key={title} className="reveal group relative grid grid-cols-[4.8rem_1fr] items-start gap-5">
                  <span className="pt-5 text-right font-display text-3xl leading-none font-extrabold italic text-pitch">{time}</span>
                  <div className="relative rounded-[1.5rem] bg-mist p-5 transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-pitch group-hover:text-white sm:p-6">
                    <span aria-hidden className="absolute top-[1.55rem] -left-[1.06rem] size-3 rounded-full border-2 border-chalk bg-pitch transition group-hover:bg-ember" />
                    <h3 className="text-2xl font-extrabold">{title}</h3>
                    <p className="mt-1 max-w-md leading-relaxed text-ink-soft transition group-hover:text-white/75">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Susunan pemain: siapa melihat apa. */}
        <section id="peran" className="scroll-mt-20 bg-pitch px-4 py-20 text-white sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div aria-hidden className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] bg-pitch-2 ring-1 ring-white/10 lg:max-w-none">
              <svg viewBox="0 0 320 400" className="absolute inset-0 size-full text-white/25" fill="none" stroke="currentColor" strokeWidth="3">
                <rect x="16" y="16" width="288" height="368" rx="6" />
                <path d="M16 200 H304" />
                <circle cx="160" cy="200" r="46" />
                <rect x="88" y="16" width="144" height="64" />
                <rect x="88" y="320" width="144" height="64" />
              </svg>
              {[
                ["left-[44%] top-[10%]", Trophy],
                ["left-[18%] top-[36%]", GraduationCap],
                ["left-[68%] top-[36%]", ClipboardCheck],
                ["left-[44%] top-[66%]", IdCard],
              ].map(([pos, Icon], i) => {
                const I = Icon as typeof Trophy;
                return (
                  <span key={i} className={`absolute grid size-14 place-items-center rounded-full bg-ember text-ink shadow-lg sm:size-16 ${pos as string}`}>
                    <I className="size-6 sm:size-7" />
                  </span>
                );
              })}
            </div>
            <div>
              <h2 className="font-display italic reveal text-6xl leading-[0.9] font-extrabold uppercase text-balance sm:text-8xl">Tiap orang, tugasnya sendiri.</h2>
              <ul className="mt-9 grid gap-3">
                {ROLES.map(({ icon: Icon, role, what }) => (
                  <li key={role} className="reveal flex items-start gap-4 rounded-[1.5rem] bg-white/6 p-5 ring-1 ring-white/10">
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-ember text-ink"><Icon className="size-5" /></span>
                    <div><p className="text-lg font-extrabold">{role}</p><p className="mt-0.5 leading-relaxed text-white/70">{what}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Tampilan: grafik di Beranda dan daftar fitur sebagai baris. */}
        <section id="tampilan" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="panel-rise order-2 lg:order-1"><BolaPreview /></div>
              <div className="order-1 lg:order-2">
                <h2 className="font-display italic reveal text-6xl leading-[0.9] font-extrabold uppercase text-balance sm:text-8xl">Angka terbaca sekilas.</h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">Kehadiran, iuran, dan jumlah pemain tampil sebagai grafik di Beranda. Di samping ini contoh dengan data fiktif.</p>
              </div>
            </div>
            <ul className="mt-16 divide-y divide-line border-y border-line">
              {[
                [CalendarCheck, "Jadwal per tim", "Latihan dan pertandingan mingguan, lengkap dengan jam dan lokasi."],
                [Wallet, "Iuran bulanan", "Tagihan per pemain, catat pembayaran, lihat siapa yang belum bayar."],
                [Megaphone, "Tautan pendaftaran", "Orang tua mendaftarkan anak lewat satu tautan. Pelatih tinggal menyetujui."],
              ].map(([Icon, name, body]) => {
                const I = Icon as typeof Wallet;
                return (
                  <li key={name as string} className="reveal group grid items-center gap-2 py-6 sm:grid-cols-[auto_1fr_1.2fr_auto] sm:gap-8">
                    <I aria-hidden className="size-7 text-pitch" />
                    <p className="font-display text-4xl leading-none font-extrabold uppercase italic transition group-hover:translate-x-2 sm:text-5xl">{name as string}</p>
                    <p className="max-w-md leading-relaxed text-ink-soft">{body as string}</p>
                    <ArrowUpRight aria-hidden className="hidden size-6 text-pitch transition group-hover:rotate-12 sm:block" />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:pb-28">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 rounded-[2rem] bg-mist p-6 sm:flex-row sm:items-center sm:p-10">
            <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-pitch text-ember"><ShieldCheck className="size-8" /></span>
            <div>
              <h2 className="font-display italic text-4xl leading-none font-extrabold uppercase sm:text-5xl">Data anak dijaga.</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">Data pemain dibuat seminimal mungkin dan persetujuan orang tua tercatat. Pelatih hanya melihat tim yang mereka pegang, dan kontak orang tua hanya terlihat bagi yang berhak.</p>
            </div>
          </div>
        </section>

        <section id="tanya" className="scroll-mt-20 px-4 pb-20 sm:px-6 lg:pb-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <h2 className="font-display italic reveal text-6xl leading-[0.9] font-extrabold uppercase sm:text-7xl">Ditanyakan orang.</h2>
            <div className="grid gap-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="reveal group rounded-[1.5rem] bg-mist p-5 open:bg-pitch open:text-white">
                  <summary className="cursor-pointer list-none text-lg font-extrabold [&::-webkit-details-marker]:hidden">{q}</summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft group-open:text-white/75">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Penutup: pita lime miring dengan maskot. */}
        <section className="relative overflow-hidden bg-ember [clip-path:polygon(0_2.5rem,100%_0,100%_100%,0_100%)] sm:[clip-path:polygon(0_4.5rem,100%_0,100%_100%,0_100%)]">
          <div className="relative mx-auto grid max-w-6xl items-end gap-4 px-5 pt-28 sm:px-8 sm:pt-36 md:grid-cols-[1.3fr_0.7fr]">
            <div className="pb-14 sm:pb-24">
              <h2 className="font-display italic reveal text-[4.2rem] leading-[0.86] font-extrabold uppercase text-balance text-pitch sm:text-[7rem]">Absen di latihan berikutnya.</h2>
              <Link href="/daftar" className="mt-8 inline-block rounded-full bg-pitch px-8 py-4 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-pitch-2">Daftarkan akademi gratis</Link>
            </div>
            <div aria-hidden className="mx-auto w-52 self-end sm:w-72"><Maskot className="drop-shadow-maskot" /></div>
          </div>
        </section>
      </main>

      <footer className="bg-night px-5 pt-14 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8">
          <p className="max-w-xs text-white/70">SatuRoom Sport, aplikasi akademi olahraga dari SatuRoom.</p>
          <nav aria-label="Pintasan" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold">
            <Link href="/masuk" className="hover:text-ember">Masuk</Link>
            <Link href="/daftar" className="hover:text-ember">Daftar</Link>
            <a href="https://saturoom.com" className="hover:text-ember">saturoom.com</a>
            <a href="https://rasa.saturoom.com" className="hover:text-ember">SatuRoom Rasa</a>
          </nav>
        </div>
        <p aria-hidden className="word-in mx-auto mt-10 max-w-6xl font-display text-[30vw] leading-[0.8] font-extrabold uppercase italic text-white/90 sm:text-[22rem]">Sport</p>
        <p className="mx-auto max-w-6xl py-6 text-sm text-white/50">© {new Date().getFullYear()} SatuRoom</p>
      </footer>
    </div>
  );
}
