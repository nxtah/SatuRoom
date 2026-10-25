import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Ruru } from "@/components/ruru";
import { getAcademy } from "@/server/academy";
import { onboardingSteps } from "@/server/onboarding";
import { requireAcademyPage } from "@/server/routing";

export const metadata: Metadata = { title: "Beranda" };

export default async function BerandaPage({ searchParams }: { searchParams: Promise<{ selamat?: string; siap?: string }> }) {
  const ctx = await requireAcademyPage();
  const [academy, steps] = await Promise.all([getAcademy(ctx), onboardingSteps(ctx)]);
  const sp = await searchParams;
  const justCreated = sp.selamat === "1";
  const remaining = steps.filter((s) => !s.done).length;
  // Langkah persiapan yang butuh izin kelola hanya ditampilkan ke yang berhak.
  const canSetUp = ctx.can("teams.manage") && ctx.can("players.manage");
  const celebrate = justCreated || (sp.siap === "1" && remaining === 0);
  const firstName = ctx.session.name.split(" ")[0];

  return (
    <div className="grid gap-5">
      <section className="rise relative flex items-end gap-4 overflow-hidden rounded-[2rem] bg-pitch px-6 pt-7 text-white sm:px-10 sm:pt-10">
        <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -top-32 -right-24 w-[420px] text-white/[0.06]">
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
          <path d="M0 200 H400" stroke="currentColor" strokeWidth="10" />
        </svg>
        <div className="relative min-w-0 flex-1 pb-8 sm:pb-10">
          <p className="font-semibold text-white/70">{justCreated ? "Akademi berhasil dibuat" : celebrate ? "Persiapan selesai" : `Halo, ${firstName}`}</p>
          <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
            {academy.name}
          </h1>
          {academy.city ? <p className="mt-2 text-white/70">{academy.city}</p> : null}
        </div>
        <div className={`relative w-28 shrink-0 sm:w-40 ${celebrate ? "pop" : ""}`}>
          <Ruru pose={celebrate ? "cheer" : "wave"} costume="academy" />
        </div>
      </section>

      {canSetUp && remaining > 0 ? (
        <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="persiapan">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="persiapan" className="text-xl font-extrabold">
              Persiapan akademi
            </h2>
            <p className="text-sm font-bold text-ink-soft">
              {steps.length - remaining} dari {steps.length} selesai
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist" aria-hidden>
            <div className="h-full rounded-full bg-turf transition-all" style={{ width: `${((steps.length - remaining) / steps.length) * 100}%` }} />
          </div>
          <ol className="mt-5 grid gap-3">
            {steps.map((step, i) =>
              step.done ? (
                <li key={step.id} className="flex items-center gap-4 rounded-2xl bg-turf-soft p-4">
                  <CircleCheck aria-hidden className="size-6 shrink-0 text-turf" />
                  <span className="flex-1 font-bold">{step.title}</span>
                  <span className="text-sm font-bold text-pitch">Selesai</span>
                </li>
              ) : (
                <li key={step.id}>
                  <Link
                    href={`${step.href}?dari=persiapan`}
                    className="group flex items-center gap-4 rounded-2xl border-2 border-line p-4 transition hover:border-ember hover:bg-ember-soft"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink-soft/40 text-xs font-extrabold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-bold">{step.title}</span>
                    <ChevronRight aria-hidden className="size-5 text-ink-soft transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ),
            )}
          </ol>
        </section>
      ) : (
        <section className="rise grid gap-3 sm:grid-cols-2" aria-label="Pintasan">
          <Link href="/tim" className="group rounded-[2rem] bg-chalk p-6 transition hover:-translate-y-0.5">
            <p className="text-xl font-extrabold">Tim</p>
            <p className="mt-1 text-ink-soft">Kelompok umur dan pelatihnya.</p>
          </Link>
          <Link href="/pemain" className="group rounded-[2rem] bg-chalk p-6 transition hover:-translate-y-0.5">
            <p className="text-xl font-extrabold">Pemain</p>
            <p className="mt-1 text-ink-soft">Cari dan kelola data pemain.</p>
          </Link>
        </section>
      )}
    </div>
  );
}
