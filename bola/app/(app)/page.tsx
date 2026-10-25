import { ChevronRight, CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Ruru } from "@/components/ruru";
import { SessionCard } from "@/components/session-card";
import { dayLabel } from "@/lib/dates";
import { ABSENT_STREAK, needsAttention } from "@/server/attendance";
import { getAcademy } from "@/server/academy";
import { onboardingSteps } from "@/server/onboarding";
import { requireAcademyPage } from "@/server/routing";
import { todaySessions } from "@/server/schedule";
import { billingHome } from "@/server/fees";
import { monthLabel, rupiah } from "@/lib/money";

export const metadata: Metadata = { title: "Beranda" };

export default async function BerandaPage({ searchParams }: { searchParams: Promise<{ selamat?: string; siap?: string }> }) {
  const ctx = await requireAcademyPage();
  const [academy, steps, day, attention, billing] = await Promise.all([
    getAcademy(ctx),
    onboardingSteps(ctx),
    todaySessions(ctx),
    needsAttention(ctx),
    billingHome(ctx),
  ]);
  const sp = await searchParams;
  const justCreated = sp.selamat === "1";
  const justJoined = sp.selamat === "gabung";
  const remaining = steps.filter((s) => !s.done).length;
  // Langkah persiapan yang butuh izin kelola hanya ditampilkan ke yang berhak.
  const canSetUp = ctx.can("teams.manage") && ctx.can("players.manage");
  const celebrate = justCreated || justJoined || (sp.siap === "1" && remaining === 0);
  const firstName = ctx.session.name.split(" ")[0];

  return (
    <div className="grid gap-5">
      <section className="rise relative flex items-end gap-4 overflow-hidden rounded-[2rem] bg-pitch px-6 pt-7 text-white sm:px-10 sm:pt-10">
        <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -top-32 -right-24 w-[420px] text-white/[0.06]">
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
          <path d="M0 200 H400" stroke="currentColor" strokeWidth="10" />
        </svg>
        <div className="relative min-w-0 flex-1 pb-8 sm:pb-10">
          <p className="font-semibold text-white/70">{justCreated ? "Akademi berhasil dibuat" : justJoined ? `Selamat bergabung, ${firstName}` : celebrate ? "Persiapan selesai" : `Halo, ${firstName}`}</p>
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
      ) : null}

      <section className="rise" aria-labelledby="hari-ini">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="hari-ini" className="text-xl font-extrabold">
            Hari ini
          </h2>
          <Link href="/jadwal" className="text-sm font-bold text-ink-soft hover:text-ink">
            {dayLabel(day.today)}, lihat jadwal
          </Link>
        </div>
        {day.sessions.length ? (
          <ul className="grid gap-2">
            {day.sessions.map((s) => (
              <li key={s.id}>
                <SessionCard s={s} today={day.today} action />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[1.5rem] border-2 border-dashed border-line px-5 py-4 text-ink-soft">Tidak ada latihan hari ini.</p>
        )}
      </section>

      {billing && billing.unpaidCount > 0 ? (
        <Link
          href="/iuran"
          className="rise group flex items-center gap-4 rounded-[2rem] bg-ember-soft p-6 transition hover:-translate-y-0.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ember-deep">Iuran {monthLabel(billing.month)}</span>
            <span className="block text-2xl font-extrabold">{rupiah(billing.outstanding)} belum terbayar</span>
            <span className="block text-sm text-ink-soft">{billing.unpaidCount} pemain</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-ember-deep transition group-hover:translate-x-0.5" />
        </Link>
      ) : null}

      {attention.length ? (
        <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="perhatian">
          <h2 id="perhatian" className="flex items-center gap-2 text-xl font-extrabold">
            <CircleAlert aria-hidden className="size-5 text-[#d92d20]" /> Perlu perhatian
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Alpa {ABSENT_STREAK} kali atau lebih berturut-turut. Mungkin perlu dihubungi.</p>
          <ul className="mt-4 grid gap-1">
            {attention.map((a) => (
              <li key={a.playerId}>
                <Link href={`/pemain/${a.playerId}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-mist">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{a.fullName}</span>
                    <span className="block truncate text-sm text-ink-soft">{a.teamNames || "Tanpa tim"}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#fdecec] px-3 py-1 text-sm font-extrabold text-[#b42318]">
                    {a.streak}x alpa
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
