import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { Ruru } from "@/components/ruru";
import { getAcademy } from "@/server/academy";
import { requireAcademyPage } from "@/server/routing";

export const metadata: Metadata = { title: "Beranda" };

export default async function BerandaPage({ searchParams }: { searchParams: Promise<{ selamat?: string }> }) {
  const ctx = await requireAcademyPage();
  const academy = await getAcademy(ctx);
  const justCreated = (await searchParams).selamat === "1";
  const firstName = ctx.session.name.split(" ")[0];

  return (
    <div className="grid gap-5">
      <section className="rise relative flex items-end gap-4 overflow-hidden rounded-[2rem] bg-pitch px-6 pt-7 text-white sm:px-10 sm:pt-10">
        <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -top-32 -right-24 w-[420px] text-white/[0.06]">
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
          <path d="M0 200 H400" stroke="currentColor" strokeWidth="10" />
        </svg>
        <div className="relative min-w-0 flex-1 pb-8 sm:pb-10">
          <p className="font-semibold text-white/70">{justCreated ? "Akademi berhasil dibuat" : `Halo, ${firstName}`}</p>
          <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
            {academy.name}
          </h1>
          {academy.city ? <p className="mt-2 text-white/70">{academy.city}</p> : null}
        </div>
        <div className={`relative w-28 shrink-0 sm:w-40 ${justCreated ? "pop" : ""}`}>
          <Ruru pose={justCreated ? "cheer" : "wave"} costume="academy" />
        </div>
      </section>

      <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="persiapan">
        <h2 id="persiapan" className="text-xl font-extrabold">
          Persiapan akademi
        </h2>
        <ul className="mt-5 grid gap-3">
          <li className="flex items-center gap-4 rounded-2xl bg-turf-soft p-4">
            <CircleCheck aria-hidden className="size-6 shrink-0 text-turf" />
            <span className="flex-1">
              <span className="block font-bold">Data akademi</span>
              <span className="block text-sm text-ink-soft">Nama dan kota sudah tersimpan.</span>
            </span>
            <span className="text-sm font-bold text-pitch">Selesai</span>
          </li>
        </ul>
        <p className="mt-5 text-sm text-ink-soft">
          Tim, pemain, jadwal latihan, dan absensi sedang disiapkan dan akan muncul di sini.
        </p>
      </section>
    </div>
  );
}
