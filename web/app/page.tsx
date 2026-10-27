import { ArrowDown, Banknote, ChefHat, ClipboardList, Package } from "lucide-react";
import { AttendanceDemo } from "@/components/attendance-demo";
import { Faq } from "@/components/faq";
import { FeatureStory } from "@/components/feature-story";
import { KitchenDemo } from "@/components/kitchen-demo";
import { BolaPreview, RasaPreview } from "@/components/dashboard-preview";
import { LogoMark, Maskot } from "@/components/maskot";
import { SiteNav } from "@/components/site-nav";
import { BOLA_URL, CONTACT_EMAIL, RASA_URL } from "@/lib/site";

const MARQUEE = ["Absensi", "Jadwal", "Iuran", "Rapor", "Kasir", "Dapur", "Stok", "Laporan"];

const BEFORE_AFTER = [
  ["Absen ditulis di kertas, lalu difoto ke grup.", "Pelatih absen di HP, langsung tersimpan."],
  ["Jadwal latihan tenggelam di chat WhatsApp.", "Jadwal mingguan per tim di satu tempat."],
  ["Data pemain tersebar di beberapa spreadsheet.", "Satu daftar pemain, rapi per tim."],
];

const RASA_FEATURES = [
  { icon: ClipboardList, title: "Kasir yang cepat", body: "Pilih menu, jumlah pesanan dihitung otomatis, lalu terima tunai, transfer, QRIS, atau kartu." },
  { icon: ChefHat, title: "Dapur langsung tahu", body: "Pesanan muncul di layar dapur begitu kasir mengirim. Koki tinggal menandai mulai dan siap." },
  { icon: Package, title: "Stok terpotong sendiri", body: "Tiap pesanan memotong bahan sesuai resep. Bahan yang hampir habis ditandai." },
  { icon: Banknote, title: "Laporan harian", body: "Penjualan, uang di laci, dan selisih kas hari ini terlihat tanpa menghitung ulang." },
];

const START_STEPS = [
  ["Daftar dengan Google atau email", "Cukup nama dan email. Tanpa kartu kredit, satu akun untuk kedua aplikasi."],
  ["Isi nama akademi atau usaha", "Akademi menambah tim, usaha makanan menambah menu. Bisa diubah kapan saja."],
  ["Mulai dipakai hari ini", "Pelatih langsung bisa absen, kasir langsung bisa menerima pesanan."],
];

export default function Home() {
  return (
    <>
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-pitch focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke isi
      </a>
      <SiteNav />

      <main id="isi">
        {/* Pembuka: merek SatuRoom, panel gelap dengan tanda S yang menyala. */}
        <section className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div className="relative mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-night px-5 pt-32 pb-44 text-white sm:rounded-[2.75rem] sm:px-10 sm:pt-44 sm:pb-52 lg:pb-56">
            <div aria-hidden className="logo-sweep pointer-events-none absolute -top-10 -right-24 w-[26rem] origin-center sm:-right-10 sm:w-[40rem] lg:right-[6%]">
              <LogoMark className="absolute inset-0 h-full w-full scale-110 opacity-70 blur-3xl" />
              <LogoMark className="relative h-auto w-full rotate-[-12deg]" />
            </div>
            <div className="relative mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h1 className="rise rise-1 font-display text-[2.9rem] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.6rem]">
                  Urusan harian jadi rapi, tanpa ribet.
                </h1>
                <p className="rise rise-2 mt-7 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
                  SatuRoom membuat aplikasi sederhana untuk akademi sepak bola dan usaha makanan. Dibuka
                  dari HP, dipakai tanpa pelatihan.
                </p>
                <div className="rise rise-3 mt-10 flex flex-wrap items-center gap-3">
                  <a
                    href="#aplikasi"
                    className="rounded-full bg-ember px-8 py-4 text-base font-bold text-ink shadow-cta transition hover:-translate-y-0.5 hover:bg-ember-bright active:translate-y-0 active:scale-[0.98]"
                  >
                    Pilih aplikasinya
                  </a>
                  <a href="#lihat" className="group inline-flex items-center gap-2 rounded-full px-5 py-4 text-base font-bold text-white/85 transition hover:bg-white/10">
                    Lihat tampilannya
                    <ArrowDown aria-hidden className="size-4 transition-transform group-hover:translate-y-0.5" />
                  </a>
                </div>
              </div>
              <div aria-hidden className="pop relative mx-auto w-64 sm:w-80 lg:mr-0 lg:w-[26rem]">
                <Maskot priority className="maskot-float drop-shadow-maskot" />
              </div>
            </div>
          </div>

          {/* Dua aplikasi menumpuk di tepi bawah panel gelap. */}
          <div id="aplikasi" className="relative mx-auto -mt-32 grid max-w-6xl scroll-mt-28 gap-3 px-1 sm:-mt-36 sm:grid-cols-2 sm:gap-4 sm:px-0">
            <article className="rise rise-3 group relative overflow-hidden rounded-[2rem] bg-pitch p-7 text-white transition duration-300 hover:-translate-y-1.5 sm:p-9">
              <svg aria-hidden viewBox="0 0 400 400" className="absolute -right-16 -bottom-20 w-72 text-white/[0.07] transition duration-500 group-hover:rotate-12">
                <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
                <path d="M0 200 H400" stroke="currentColor" strokeWidth="10" />
              </svg>
              <h2 className="relative font-display text-3xl font-extrabold tracking-tight sm:text-4xl">SatuRoom Bola</h2>
              <p className="relative mt-3 max-w-xs text-base leading-relaxed text-white/75">
                Pemain, jadwal latihan, absensi, iuran, dan rapor untuk akademi sepak bola.
              </p>
              <div className="relative mt-8 flex flex-wrap gap-2">
                <a href={`${BOLA_URL}/daftar`} className="rounded-full bg-ember px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-ember-bright active:scale-[0.97]">
                  Coba Bola gratis
                </a>
                <a href="#bola" className="rounded-full px-5 py-3.5 text-sm font-bold transition hover:bg-white/10">Lihat fitur</a>
              </div>
            </article>
            <article className="rise rise-3 group relative overflow-hidden rounded-[2rem] bg-kitchen p-7 text-white transition duration-300 hover:-translate-y-1.5 sm:p-9">
              <svg aria-hidden viewBox="0 0 400 400" className="absolute -right-16 -bottom-20 w-72 text-white/[0.06] transition duration-500 group-hover:-rotate-12">
                <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
                <circle cx="200" cy="200" r="90" fill="none" stroke="currentColor" strokeWidth="10" />
              </svg>
              <h2 className="relative font-display text-3xl font-extrabold tracking-tight sm:text-4xl">SatuRoom Rasa</h2>
              <p className="relative mt-3 max-w-xs text-base leading-relaxed text-white/75">
                Kasir, dapur, stok, dan laporan harian untuk kafe, warung, dan resto kecil.
              </p>
              <div className="relative mt-8 flex flex-wrap gap-2">
                <a href={`${RASA_URL}/daftar`} className="rounded-full bg-saffron px-6 py-3.5 text-sm font-bold text-kitchen transition hover:brightness-110 active:scale-[0.97]">
                  Coba Rasa gratis
                </a>
                <a href="#rasa" className="rounded-full px-5 py-3.5 text-sm font-bold transition hover:bg-white/10">Lihat fitur</a>
              </div>
            </article>
          </div>
        </section>

        {/* Baris kata berjalan: apa saja yang diurus. */}
        <div aria-hidden className="mt-16 overflow-hidden py-4 lg:mt-24">
          <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-8">
                {MARQUEE.map((w, i) => (
                  <span key={`${k}-${w}`} className="flex items-center gap-8">
                    <span className={i % 3 === 0 ? "text-ember" : i % 3 === 1 ? "text-pitch" : "text-ink/20"}>{w}</span>
                    <LogoMark className="h-8 sm:h-11" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="sr-only">Absensi, jadwal, iuran, rapor, kasir, dapur, stok, dan laporan harian.</p>

        {/* Dasbor: angka diberi bentuk supaya terbaca sekilas. */}
        <section id="lihat" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-3xl font-display text-4xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-6xl">
              Angka usahamu, langsung terbaca.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Dasbor menampilkan kehadiran, iuran, dan penjualan sebagai grafik, bukan tumpukan tabel. Di bawah ini contoh tampilan dengan data fiktif.
            </p>
            <div className="mt-12 grid items-start gap-5 lg:grid-cols-2">
              <div className="panel-rise">
                <p className="mb-3 font-display text-lg font-extrabold text-turf">SatuRoom Bola</p>
                <BolaPreview />
              </div>
              <div className="panel-rise lg:mt-16">
                <p className="mb-3 font-display text-lg font-extrabold text-tomato">SatuRoom Rasa</p>
                <RasaPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Bola */}
        <section id="bola" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="font-display text-lg font-extrabold text-turf">SatuRoom Bola</p>
            <h2 className="reveal mt-2 max-w-3xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Urus akademi bola cukup dari HP.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Pelatih absen dalam hitungan detik, pemilik tahu kondisi akademi tanpa bertanya di grup.
            </p>

            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative overflow-hidden rounded-[2rem] bg-pitch px-6 py-10 text-white sm:px-10 sm:py-12">
                <div aria-hidden className="absolute -top-2 right-6 hidden w-28 sm:block">
                  <Maskot />
                </div>
                <h3 className="max-w-md font-display text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
                  Kalau urusannya masih begini, wajar capek.
                </h3>
                <ul className="mt-8 grid gap-3">
                  {BEFORE_AFTER.map(([before, after]) => (
                    <li key={before} className="grid gap-2 rounded-[1.5rem] bg-pitch-2 p-5">
                      <p className="strike text-base text-white/70 decoration-2">{before}</p>
                      <p className="after-lit flex items-center gap-3 text-base font-bold">
                        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-ember text-xs text-ink">
                          ✓
                        </span>
                        {after}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="phone-scroll relative">
                <AttendanceDemo />
                <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
                  Coba tandai kehadiran di layar contoh ini.
                </p>
              </div>
            </div>

            <div className="mt-20 lg:mt-24">
              <h3 className="reveal max-w-2xl font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                Yang dipakai setiap hari di akademi.
              </h3>
              <div className="mt-10 lg:mt-4">
                <FeatureStory />
              </div>
            </div>

            <div className="mt-12">
              <a
                href={`${BOLA_URL}/daftar`}
                className="inline-block rounded-full bg-pitch px-7 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-pitch-2 active:translate-y-0"
              >
                Coba Bola gratis
              </a>
            </div>
          </div>
        </section>

        {/* Rasa */}
        <section id="rasa" className="scroll-mt-24 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-kitchen px-6 py-14 text-white sm:px-12 sm:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="font-display text-lg font-extrabold text-saffron">SatuRoom Rasa</p>
                <h2 className="reveal mt-2 max-w-xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
                  Dari pesanan masuk sampai dapur siap, semua tetap rapi.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
                  Satu alur untuk kasir, pelayan, dapur, stok, dan pemilik. Tanpa nota yang hilang.
                </p>
                <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                  {RASA_FEATURES.map(({ icon: Icon, title, body }, i) => (
                    <li
                      key={title}
                      className={`reveal group rounded-[1.5rem] p-5 transition duration-300 hover:-translate-y-1 ${
                        i === 0 ? "bg-saffron text-kitchen sm:col-span-2 sm:p-7" : i === 3 ? "bg-basil text-white" : "bg-kitchen-2"
                      }`}
                    >
                      <span aria-hidden className={`grid size-11 place-items-center rounded-2xl transition group-hover:rotate-6 ${i === 0 ? "bg-kitchen text-saffron" : "bg-saffron text-kitchen"}`}>
                        <Icon className="size-5" />
                      </span>
                      <h3 className={`mt-4 font-display font-extrabold ${i === 0 ? "text-2xl sm:text-3xl" : "text-xl"}`}>{title}</h3>
                      <p className={`mt-1.5 text-base leading-relaxed ${i === 0 ? "max-w-md text-kitchen/80" : "text-white/75"}`}>{body}</p>
                    </li>
                  ))}
                </ul>
                <a
                  href={`${RASA_URL}/daftar`}
                  className="mt-10 inline-block rounded-full bg-saffron px-7 py-4 text-base font-bold text-kitchen transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                >
                  Coba Rasa gratis
                </a>
              </div>
              <div className="relative">
                <KitchenDemo />
                <p className="mt-5 text-center text-sm font-semibold text-white/70">
                  Coba proses pesanan di layar dapur contoh ini.
                </p>
                <div aria-hidden className="absolute bottom-14 -left-2 w-20 sm:-left-10 sm:w-28">
                  <Maskot />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara mulai: memang berurutan, jadi diberi nomor. */}
        <section id="mulai" className="scroll-mt-24 bg-mist px-4 py-16 sm:px-6 lg:mt-16 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-2xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
              Siap dipakai hari ini juga.
            </h2>
            <div aria-hidden className="mt-12 hidden h-1.5 overflow-hidden rounded-full bg-line md:block">
              <div className="grow-x h-full w-full rounded-full bg-ember" />
            </div>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {START_STEPS.map(([title, body], i) => (
                <li
                  key={title}
                  className="reveal group relative rounded-[1.5rem] bg-chalk p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="font-display text-6xl font-extrabold text-turf-soft transition-colors duration-300 group-hover:text-ember">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-extrabold">{title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-soft">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tanya" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="reveal font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
                Yang sering ditanyakan.
              </h2>
              {CONTACT_EMAIL ? (
                <p className="mt-5 text-lg text-ink-soft">
                  Pertanyaan lain? Kirim email ke{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-bold text-ink underline decoration-ember decoration-2 underline-offset-4"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              ) : null}
            </div>
            <Faq />
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden rounded-[2rem] bg-ember px-6 pt-14 text-center sm:pt-20">
            <svg aria-hidden viewBox="0 0 400 400" className="absolute -bottom-40 left-1/2 w-[640px] max-w-none -translate-x-1/2 text-ember-deep/25">
              <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="6" />
              <circle cx="200" cy="200" r="90" fill="none" stroke="currentColor" strokeWidth="6" />
              <path d="M10 200 H390" stroke="currentColor" strokeWidth="6" />
            </svg>
            <h2 className="reveal relative max-w-2xl font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
              Mulai rapikan usahamu minggu ini.
            </h2>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={`${BOLA_URL}/daftar`}
                className="rounded-full bg-pitch px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-pitch-2 active:translate-y-0"
              >
                Coba Bola gratis
              </a>
              <a
                href={`${RASA_URL}/daftar`}
                className="rounded-full bg-kitchen px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-kitchen-2 active:translate-y-0"
              >
                Coba Rasa gratis
              </a>
            </div>
            <div className="pop-up relative mt-10 w-52 sm:w-72">
              <Maskot className="drop-shadow-maskot" />
            </div>
          </div>
        </section>
      </main>

      <footer className="px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-night px-5 pt-14 text-white sm:rounded-[2.75rem] sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8">
            <p className="max-w-xs text-white/70">SatuRoom membuat aplikasi untuk bisnis yang ingin rapi tanpa ribet.</p>
            <nav aria-label="Pintasan" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold">
              <a href="#bola" className="hover:text-ember">Bola</a>
              <a href="#rasa" className="hover:text-saffron">Rasa</a>
              <a href="#mulai" className="hover:text-white/70">Cara mulai</a>
              <a href="#tanya" className="hover:text-white/70">Tanya jawab</a>
              <a href={`${BOLA_URL}/masuk`} className="hover:text-ember">Masuk Bola</a>
              <a href={`${RASA_URL}/masuk`} className="hover:text-saffron">Masuk Rasa</a>
            </nav>
          </div>
          <div aria-hidden className="word-in mx-auto mt-14 mb-4 flex max-w-6xl items-end gap-[2vw]">
            <LogoMark className="h-[16vw] max-h-52 shrink-0" />
            <span className="font-display text-[17vw] leading-[0.78] font-extrabold tracking-[-0.05em] text-white/90 xl:text-[14rem]">SatuRoom</span>
          </div>
          <p className="mx-auto max-w-6xl py-6 text-sm text-white/50">© {new Date().getFullYear()} SatuRoom</p>
        </div>
      </footer>
    </>
  );
}
