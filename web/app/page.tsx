import { ArrowDown, ArrowUpRight, Plus } from "lucide-react";
import { AttendanceDemo } from "@/components/attendance-demo";
import { BolaPreview, RasaPreview } from "@/components/dashboard-preview";
import { Faq } from "@/components/faq";
import { KitchenDemo } from "@/components/kitchen-demo";
import { LogoMark, Maskot } from "@/components/maskot";
import { SiteNav } from "@/components/site-nav";
import { BOLA_URL, CONTACT_EMAIL, MAHJONG_URL, RASA_URL } from "@/lib/site";

/* Hal yang memang dipakai bersama oleh semua aplikasi SatuRoom. */
const FOUNDATION = [
  ["Satu akun", "Daftar sekali dengan Google atau email, dipakai di semua aplikasi SatuRoom."],
  ["ID bisnis untuk tiap usaha", "Punya dua usaha? Masuk dengan ID bisnis, email, dan password agar usaha yang terbuka selalu yang benar."],
  ["Data terpisah per usaha", "Data satu usaha tidak bisa dibuka usaha lain, dan tiap orang hanya melihat yang sesuai perannya."],
  ["Aplikasi khusus tiap jenis usaha", "Istilah, menu, dan alur kerja mengikuti dunia usahanya, bukan dasbor umum yang dipaksakan."],
] as const;

const START_STEPS = [
  ["Daftar dengan Google atau email", "Cukup nama dan email. Tanpa kartu kredit, satu akun untuk semua aplikasi."],
  ["Isi nama akademi atau usaha", "Akademi menambah tim, usaha makanan menambah menu. Bisa diubah kapan saja."],
  ["Mulai dipakai hari ini", "Pelatih langsung bisa absen, kasir langsung bisa menerima pesanan."],
] as const;

export default function Home() {
  return (
    <>
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-pitch focus:px-4 focus:py-2 focus:text-white">
        Lewati ke isi
      </a>
      <SiteNav />

      <main id="isi">
        {/* Pembuka: pernyataan induk di kiri, peta ekosistem di kanan. Tanpa panel gelap. */}
        <section className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_70%_40%,black,transparent)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="rise font-display text-[3.4rem] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance sm:text-[6rem] lg:text-[6.6rem]">
                Satu ruang untuk <span className="text-ember">semua</span> usaha.
              </h1>
              <p className="rise rise-2 mt-7 max-w-lg text-lg leading-relaxed text-ink-soft sm:text-xl">
                SatuRoom membuat aplikasi yang pas untuk tiap jenis usaha, dengan satu akun dan data yang tertata.
              </p>
              <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
                <a href="#ruang" className="rounded-full bg-pitch px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-pitch-2 active:scale-[0.98]">
                  Pilih ruangmu
                </a>
                <a href="#ekosistem" className="group inline-flex items-center gap-2 rounded-full px-5 py-4 text-base font-bold transition hover:bg-mist">
                  Cara kerjanya
                  <ArrowDown aria-hidden className="size-4 transition-transform group-hover:translate-y-0.5" />
                </a>
              </div>
            </div>

            <div className="pop relative mx-auto aspect-square w-full max-w-[32rem]" role="img" aria-label="SatuRoom di tengah, terhubung ke SatuRoom Sport, SatuRoom Rasa, dan usaha berikutnya.">
              <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full">
                <circle cx="50" cy="50" r="20" fill="none" stroke="var(--color-line)" strokeWidth="0.4" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-line)" strokeWidth="0.4" />
                <g stroke="var(--color-ink)" strokeWidth="0.5" fill="none">
                  <path className="flow-line" d="M50 50 L24 20" />
                  <path className="flow-line" d="M50 50 L74 34" />
                </g>
                <g stroke="var(--color-ink-soft)" strokeWidth="0.4" fill="none" strokeDasharray="1.2 2">
                  <path d="M50 50 L40 82" />
                </g>
              </svg>
              <div className="absolute top-1/2 left-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-pitch shadow-lift sm:size-28">
                <LogoMark className="h-12 sm:h-14" />
              </div>
              <div className="absolute top-[20%] left-[24%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-navy px-3 py-2 sm:px-4 sm:py-3 text-lime shadow-lift">
                <p className="font-display text-xl leading-none font-extrabold sm:text-2xl">Sport</p>
                <p className="mt-1 text-xs font-semibold text-white/70">Akademi olahraga</p>
              </div>
              <div className="absolute top-[34%] left-[74%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-tomato px-3 py-2 sm:px-4 sm:py-3 text-white shadow-lift">
                <p className="font-display text-xl leading-none font-extrabold sm:text-2xl">Rasa</p>
                <p className="mt-1 text-xs font-semibold text-white/85">Makanan dan minuman</p>
              </div>
              <div className="absolute top-[82%] left-[40%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl border-2 border-dashed border-ink-soft/50 px-3 py-2 sm:px-4 sm:py-3 text-ink-soft">
                <p className="flex items-center gap-1 text-sm font-bold"><Plus aria-hidden className="size-4" />Usaha berikutnya</p>
              </div>
            </div>
          </div>
        </section>

        {/* Ekosistem: fondasi bersama, arang. */}
        <section id="ekosistem" className="scroll-mt-20 bg-pitch px-4 py-20 text-white sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="reveal font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">Satu fondasi, banyak ruang.</h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">Tiap usaha dapat aplikasinya sendiri. Di bawahnya, akun, keamanan data, dan cara masuknya sama.</p>
            </div>
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {FOUNDATION.map(([title, body]) => (
                <li key={title} className="reveal grid gap-2 py-7 sm:grid-cols-[0.8fr_1.2fr] sm:gap-8">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight">{title}</h3>
                  <p className="leading-relaxed text-white/70">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Dua ruang: layar terbelah, masing-masing dengan wajahnya sendiri. */}
        <section id="ruang" className="scroll-mt-20 grid lg:grid-cols-2">
          <article className="group relative overflow-hidden bg-navy px-6 py-16 text-white sm:px-12 lg:px-16 lg:py-24">
            <span aria-hidden className="absolute -top-10 right-[6%] hidden h-[140%] w-8 -rotate-[24deg] bg-lime sm:block sm:w-12" />
            <span aria-hidden className="absolute -top-10 right-[-2%] hidden h-[140%] w-3 -rotate-[24deg] bg-lime/40 sm:block" />
            <div className="relative max-w-md">
              <p className="font-semibold text-lime">Untuk akademi dan klub olahraga</p>
              <h2 className="reveal mt-3 font-display text-6xl leading-[0.88] font-extrabold tracking-[-0.04em] italic sm:text-8xl">SatuRoom Sport</h2>
              <p className="mt-6 text-lg leading-relaxed text-white/75">Pemain, jadwal latihan, absensi, iuran, dan rapor untuk akademi sepak bola, basket, voli, tenis, dan cabang lain. Pelatih absen dari HP dalam hitungan detik. Pelatih absen dari HP dalam hitungan detik.</p>
              <div className="mt-9 flex flex-wrap gap-2">
                <a href={`${BOLA_URL}/selamat-datang`} className="inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:bg-[#d7ff55] active:scale-[0.98]">
                  Lihat SatuRoom Sport<ArrowUpRight aria-hidden className="size-4" />
                </a>
                <a href={`${BOLA_URL}/masuk`} className="rounded-full px-5 py-4 text-base font-bold transition hover:bg-white/10">Masuk</a>
              </div>
            </div>
          </article>
          <article className="relative overflow-hidden bg-cream px-6 py-16 sm:px-12 lg:px-16 lg:py-24">
            <div aria-hidden className="absolute -right-16 -bottom-20 size-72 rounded-full bg-saffron sm:size-96" />
            <div className="relative max-w-md">
              <p className="font-semibold text-chili">Untuk kafe, warung, dan resto</p>
              <h2 className="reveal mt-3 font-display text-6xl leading-[0.88] font-extrabold tracking-[-0.04em] text-kitchen sm:text-8xl">SatuRoom Rasa</h2>
              <p className="mt-6 text-lg leading-relaxed text-kitchen/80">Kasir, layar dapur, stok yang terpotong sesuai resep, dan laporan harian. Dari pesanan masuk sampai dapur siap.</p>
              <div className="mt-9 flex flex-wrap gap-2">
                <a href={`${RASA_URL}/selamat-datang`} className="inline-flex items-center gap-2 rounded-full bg-tomato px-7 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-chili active:scale-[0.98]">
                  Lihat SatuRoom Rasa<ArrowUpRight aria-hidden className="size-4" />
                </a>
                <a href={`${RASA_URL}/masuk`} className="rounded-full px-5 py-4 text-base font-bold text-kitchen transition hover:bg-saffron/40">Masuk</a>
              </div>
            </div>
          </article>
        </section>

        {/* Contoh dasbor: dua gaya, satu pola membaca angka. */}
        <section id="lihat" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-3xl font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">Angka usahamu, langsung terbaca.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">Dasbor menampilkan kehadiran, iuran, dan penjualan sebagai grafik, bukan tumpukan tabel. Contoh di bawah memakai data fiktif.</p>
            <div className="mt-12 grid items-start gap-5 lg:grid-cols-2">
              <div className="panel-rise">
                <p className="mb-3 font-display text-lg font-extrabold">SatuRoom Sport</p>
                <BolaPreview />
              </div>
              <div className="panel-rise lg:mt-16">
                <p className="mb-3 font-display text-lg font-extrabold">SatuRoom Rasa</p>
                <RasaPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Coba langsung: dua layar contoh yang bisa disentuh. */}
        <section className="bg-mist px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-2xl font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">Coba langsung, tanpa daftar.</h2>
            <div className="mt-14 grid items-start gap-14 lg:grid-cols-2 lg:gap-8">
              <div>
                <AttendanceDemo />
                <p className="mt-5 text-center text-sm font-semibold text-ink-soft">Tandai kehadiran di layar contoh Sport.</p>
              </div>
              <div className="lg:mt-24">
                <div className="rounded-[2rem] bg-kitchen p-4 sm:p-6"><KitchenDemo /></div>
                <p className="mt-5 text-center text-sm font-semibold text-ink-soft">Proses pesanan di layar dapur contoh Rasa.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cara mulai: memang berurutan, jadi diberi nomor. */}
        <section id="mulai" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-2xl font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-6xl">Siap dipakai hari ini juga.</h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {START_STEPS.map(([title, body], i) => (
                <li key={title} className="reveal border-t-2 border-ink pt-6">
                  <span className="font-display text-7xl leading-none font-extrabold text-ember">{i + 1}</span>
                  <h3 className="mt-5 font-display text-2xl font-extrabold tracking-tight">{title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tanya" className="scroll-mt-20 bg-mist px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="reveal font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-6xl">Yang sering ditanyakan.</h2>
              {CONTACT_EMAIL ? (
                <p className="mt-5 text-lg text-ink-soft">
                  Pertanyaan lain? Kirim email ke{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-ink underline decoration-ember decoration-2 underline-offset-4">{CONTACT_EMAIL}</a>.
                </p>
              ) : null}
            </div>
            <Faq />
          </div>
        </section>

        {/* Penutup: arang, maskot hanya muncul di sini. */}
        <section className="bg-pitch px-4 pt-20 text-white sm:px-6 lg:pt-28">
          <div className="mx-auto grid max-w-6xl items-end gap-8 md:grid-cols-[1.3fr_0.7fr]">
            <div className="pb-16 lg:pb-28">
              <h2 className="reveal font-display text-[3.4rem] leading-[0.92] font-extrabold tracking-[-0.045em] text-balance sm:text-[5.6rem]">Pilih ruangmu, mulai hari ini.</h2>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={`${BOLA_URL}/daftar`} className="rounded-full bg-lime px-8 py-4 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:bg-[#d7ff55] active:scale-[0.98]">Coba Sport gratis</a>
                <a href={`${RASA_URL}/daftar`} className="rounded-full bg-ember px-8 py-4 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:bg-ember-bright active:scale-[0.98]">Coba Rasa gratis</a>
              </div>
            </div>
            <div aria-hidden className="mx-auto w-52 self-end sm:w-72"><Maskot className="drop-shadow-maskot" /></div>
          </div>
        </section>
      </main>

      <footer className="bg-night px-5 pt-14 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8">
          <p className="max-w-xs text-white/70">SatuRoom membuat aplikasi untuk bisnis yang ingin rapi tanpa ribet.</p>
          <nav aria-label="Pintasan" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold">
            <a href="#ekosistem" className="hover:text-ember">Ekosistem</a>
            <a href="#ruang" className="hover:text-ember">Aplikasi</a>
            <a href="#mulai" className="hover:text-ember">Cara mulai</a>
            <a href="#tanya" className="hover:text-ember">Tanya jawab</a>
            <a href={`${BOLA_URL}/masuk`} className="hover:text-lime">Masuk Sport</a>
            <a href={`${RASA_URL}/masuk`} className="hover:text-saffron">Masuk Rasa</a>
            <a href={`${MAHJONG_URL}/selamat-datang`} className="hover:text-ember">SatuRoom Mahjong</a>
          </nav>
        </div>
        <div aria-hidden className="word-in mx-auto mt-12 mb-4 flex max-w-6xl items-end gap-[2vw]">
          <LogoMark className="h-[13vw] max-h-52 shrink-0" />
          <span className="font-display text-[14vw] leading-[0.78] font-extrabold tracking-[-0.05em] text-white/90 xl:text-[14rem]">SatuRoom</span>
        </div>
        <p className="mx-auto max-w-6xl py-6 text-sm text-white/50">© {new Date().getFullYear()} SatuRoom</p>
      </footer>
    </>
  );
}
