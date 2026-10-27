import { ArrowDown, Banknote, ChefHat, ClipboardList, Package } from "lucide-react";
import { AttendanceDemo } from "@/components/attendance-demo";
import { Faq } from "@/components/faq";
import { FeatureStory } from "@/components/feature-story";
import { KitchenDemo } from "@/components/kitchen-demo";
import { Ruru } from "@/components/ruru";
import { SiteNav } from "@/components/site-nav";
import { BOLA_URL, CONTACT_EMAIL, RASA_URL } from "@/lib/site";

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
        {/* Pembuka: merek SatuRoom dan dua aplikasinya. */}
        <section className="relative overflow-x-clip px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:pb-28">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <h1 className="rise rise-1 font-display text-[2.75rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
                Urusan harian jadi rapi, tanpa ribet.
              </h1>
              <p className="rise rise-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
                SatuRoom membuat aplikasi sederhana untuk akademi sepak bola dan usaha makanan. Dibuka
                dari HP, dipakai tanpa pelatihan.
              </p>
              <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#aplikasi"
                  className="rounded-full bg-ember px-7 py-4 text-base font-bold text-ink shadow-cta transition hover:-translate-y-0.5 hover:bg-ember-bright active:translate-y-0 active:scale-[0.98]"
                >
                  Pilih aplikasinya
                </a>
                <a
                  href="#bola"
                  className="group inline-flex items-center gap-2 rounded-full px-5 py-4 text-base font-bold transition hover:bg-mist"
                >
                  Lihat cara kerjanya
                  <ArrowDown aria-hidden className="size-4 transition-transform group-hover:translate-y-0.5" />
                </a>
              </div>
            </div>

            <div id="aplikasi" className="rise rise-3 grid scroll-mt-28 gap-4">
              <article className="relative overflow-hidden rounded-[2rem] bg-pitch p-6 text-white sm:p-8">
                <div className="max-w-[16rem]">
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">SatuRoom Bola</h2>
                  <p className="mt-2 text-base leading-relaxed text-white/75">
                    Pemain, jadwal latihan, absensi, iuran, dan rapor untuk akademi sepak bola.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href={`${BOLA_URL}/daftar`}
                    className="rounded-full bg-ember px-5 py-3 text-sm font-bold text-ink transition hover:bg-ember-bright active:scale-[0.97]"
                  >
                    Coba Bola gratis
                  </a>
                  <a href="#bola" className="rounded-full px-4 py-3 text-sm font-bold transition hover:bg-white/10">
                    Lihat fitur
                  </a>
                </div>
                <div aria-hidden className="absolute top-4 right-3 w-20 sm:top-auto sm:-right-3 sm:-bottom-2 sm:w-40">
                  <Ruru pose="wave" costume="academy" />
                </div>
              </article>

              <article className="relative overflow-hidden rounded-[2rem] bg-kitchen p-6 text-white sm:p-8">
                <div className="max-w-[16rem]">
                  <h2 className="font-display text-3xl font-extrabold tracking-tight">SatuRoom Rasa</h2>
                  <p className="mt-2 text-base leading-relaxed text-white/75">
                    Kasir, dapur, stok, dan laporan harian untuk kafe, warung, dan resto kecil.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href={`${RASA_URL}/daftar`}
                    className="rounded-full bg-saffron px-5 py-3 text-sm font-bold text-kitchen transition hover:brightness-110 active:scale-[0.97]"
                  >
                    Coba Rasa gratis
                  </a>
                  <a href="#rasa" className="rounded-full px-4 py-3 text-sm font-bold transition hover:bg-white/10">
                    Lihat fitur
                  </a>
                </div>
                <div aria-hidden className="absolute top-4 right-3 w-20 sm:top-auto sm:-right-3 sm:-bottom-2 sm:w-40">
                  <Ruru pose="cheer" costume="chef" />
                </div>
              </article>
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
                  <Ruru pose="think" />
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
                <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                  {RASA_FEATURES.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="reveal rounded-[1.5rem] bg-kitchen-2 p-5">
                      <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-saffron text-kitchen">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="mt-4 font-display text-xl font-extrabold">{title}</h3>
                      <p className="mt-1.5 text-base leading-relaxed text-white/70">{body}</p>
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
                  <Ruru pose="happy" costume="chef" />
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
            <div className="pop-up relative mt-10 flex items-end gap-2">
              <div className="w-36 sm:w-48">
                <Ruru pose="wave" costume="academy" />
              </div>
              <div className="w-36 sm:w-48">
                <Ruru pose="cheer" costume="chef" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-ink-soft">
          <p>
            <span className="font-display font-extrabold text-ink">SatuRoom</span>, aplikasi untuk
            bisnis yang ingin rapi tanpa ribet.
          </p>
          <nav aria-label="Pintasan" className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            <a href="#bola" className="hover:text-ink">Bola</a>
            <a href="#rasa" className="hover:text-ink">Rasa</a>
            <a href="#mulai" className="hover:text-ink">Cara mulai</a>
            <a href="#tanya" className="hover:text-ink">Tanya jawab</a>
            <a href={`${BOLA_URL}/masuk`} className="hover:text-ink">Masuk Bola</a>
            <a href={`${RASA_URL}/masuk`} className="hover:text-ink">Masuk Rasa</a>
          </nav>
          <p>© {new Date().getFullYear()} SatuRoom</p>
        </div>
      </footer>
    </>
  );
}
