import { ArrowDown } from "lucide-react";
import { AttendanceDemo } from "@/components/attendance-demo";
import { Faq } from "@/components/faq";
import { FeatureStory } from "@/components/feature-story";
import { Ruru } from "@/components/ruru";
import { SiteNav } from "@/components/site-nav";
import { APP_URL, CONTACT_EMAIL } from "@/lib/site";

const BEFORE_AFTER = [
  ["Absen ditulis di kertas, lalu difoto ke grup.", "Pelatih absen di HP, langsung tersimpan."],
  ["Jadwal latihan tenggelam di chat WhatsApp.", "Jadwal mingguan per tim di satu tempat."],
  ["Data pemain tersebar di beberapa spreadsheet.", "Satu daftar pemain, rapi per tim."],
];

const START_STEPS = [
  ["Daftar dengan email", "Cukup nama, email, dan password. Tanpa kartu kredit."],
  ["Isi nama akademi dan tim", "Misalnya U-10 dan U-12. Bisa ditambah kapan saja."],
  ["Tambah pemain, undang pelatih", "Pelatih langsung bisa absen di latihan berikutnya."],
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
        {/* Pembuka: janji utama di kiri, contoh absensi yang bisa dicoba di kanan. */}
        <section className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:pb-24">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
            <div>
              <p className="rise inline-flex items-center gap-2 rounded-full bg-turf-soft py-1.5 pr-4 pl-1.5 text-sm font-bold text-pitch">
                <span className="w-7">
                  <Ruru pose="happy" />
                </span>
                Untuk akademi sepak bola
              </p>
              <h1 className="rise rise-1 mt-6 font-display text-[2.75rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
                Urus akademi bola cukup dari HP.
              </h1>
              <p className="rise rise-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
                Data pemain, jadwal latihan, dan absensi dalam satu aplikasi. Pelatih absen dalam
                hitungan detik, pemilik tahu kondisi akademi tanpa bertanya di grup.
              </p>
              <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
                <a
                  href={`${APP_URL}/daftar`}
                  className="rounded-full bg-ember px-7 py-4 text-base font-bold text-ink shadow-[0_12px_30px_-12px_rgb(255_106_0/0.7)] transition hover:-translate-y-0.5 hover:bg-[#ff7d24] active:translate-y-0 active:scale-[0.98]"
                >
                  Coba gratis
                </a>
                <a
                  href="#fitur"
                  className="group inline-flex items-center gap-2 rounded-full px-5 py-4 text-base font-bold transition hover:bg-mist"
                >
                  Lihat cara kerjanya
                  <ArrowDown
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-y-0.5"
                  />
                </a>
              </div>
            </div>

            <div className="rise rise-3 relative">
              {/* Lingkaran tengah lapangan sebagai latar, bukan gradien. */}
              <svg
                aria-hidden
                viewBox="0 0 400 400"
                className="absolute top-1/2 left-1/2 -z-10 w-[130%] max-w-[620px] -translate-x-1/2 -translate-y-1/2 text-turf-soft"
              >
                <circle cx="200" cy="200" r="190" fill="currentColor" />
                <circle cx="200" cy="200" r="110" fill="none" stroke="#fff" strokeWidth="6" />
                <path d="M10 200 H390" stroke="#fff" strokeWidth="6" />
                <circle cx="200" cy="200" r="9" fill="#fff" />
              </svg>
              <div className="phone-scroll">
                <AttendanceDemo />
              </div>
              <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
                Coba tandai kehadiran di layar contoh ini.
              </p>
            </div>
          </div>
        </section>

        {/* Masalah yang diselesaikan, dalam bahasa pemilik akademi. */}
        <section className="px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-pitch px-6 py-12 text-white sm:px-12 sm:py-16">
            <h2 className="max-w-2xl font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              Kalau urusannya masih begini, wajar capek.
            </h2>
            <ul className="mt-10 grid gap-3">
              {BEFORE_AFTER.map(([before, after]) => (
                <li
                  key={before}
                  className="grid items-center gap-3 rounded-[1.5rem] bg-pitch-2 p-5 sm:grid-cols-2 sm:gap-8 sm:p-6"
                >
                  <p className="text-base text-white/60 line-through decoration-white/30 sm:text-lg">
                    {before}
                  </p>
                  <p className="flex items-center gap-3 text-base font-bold sm:text-lg">
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-ember text-sm text-ink"
                    >
                      ✓
                    </span>
                    {after}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="fitur" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Yang dipakai setiap hari di akademi.
            </h2>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Tidak ada menu yang membingungkan. Hanya pemain, jadwal, absensi, dan staf.
            </p>
            <div className="mt-14 lg:mt-4">
              <FeatureStory />
            </div>
          </div>
        </section>

        {/* Cara mulai: memang berurutan, jadi diberi nomor. */}
        <section id="mulai" className="scroll-mt-24 bg-mist px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-2xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
              Siap dipakai di latihan berikutnya.
            </h2>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {START_STEPS.map(([title, body], i) => (
                <li
                  key={title}
                  className="group relative rounded-[1.5rem] bg-chalk p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgb(13_59_46/0.45)]"
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
              <h2 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
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
            <h2 className="max-w-2xl font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
              Mulai rapikan akademimu minggu ini.
            </h2>
            <a
              href={`${APP_URL}/daftar`}
              className="mt-8 rounded-full bg-pitch px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-pitch-2 active:translate-y-0"
            >
              Coba gratis
            </a>
            <div className="mt-10 w-44 sm:w-56">
              <Ruru pose="wave" costume="academy" />
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
          <p>© {new Date().getFullYear()} SatuRoom</p>
        </div>
      </footer>
    </>
  );
}
