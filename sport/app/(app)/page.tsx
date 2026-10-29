import { ChevronRight, CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Maskot } from "@/components/maskot";
import { sportOf } from "@/lib/sports";
import { SessionCard } from "@/components/session-card";
import { dayLabel } from "@/lib/dates";
import { ABSENT_STREAK, needsAttention } from "@/server/attendance";
import { getAcademy } from "@/server/academy";
import { onboardingSteps } from "@/server/onboarding";
import { requireAcademyPage } from "@/server/routing";
import { todaySessions } from "@/server/schedule";
import { billingHome } from "@/server/fees";
import { homeStats } from "@/server/stats";
import { AttendanceWidgets, StatTiles } from "@/components/home-stats";
import { MatchWidget } from "@/components/match-widget";
import { matchesOverview } from "@/server/matches";
import { formatBusinessCode } from "@/lib/business-code";
import { monthLabel, rupiah } from "@/lib/money";

export const metadata: Metadata = { title: "Beranda" };

export default async function BerandaPage({ searchParams }: { searchParams: Promise<{ selamat?: string; siap?: string }> }) {
  const ctx = await requireAcademyPage();
  const [academy, steps, day, attention, billing, stats, matches] = await Promise.all([
    getAcademy(ctx),
    onboardingSteps(ctx),
    todaySessions(ctx),
    needsAttention(ctx),
    billingHome(ctx),
    homeStats(ctx),
    matchesOverview(ctx),
  ]);
  const sp = await searchParams;
  const justCreated = sp.selamat === "1";
  const justJoined = sp.selamat === "gabung";
  const remaining = steps.filter((s) => !s.done).length;
  const nextStep = steps.find((st) => !st.done);
  // Langkah persiapan yang butuh izin kelola hanya ditampilkan ke yang berhak.
  const canSetUp = ctx.can("teams.manage") && ctx.can("players.manage");
  const celebrate = justCreated || justJoined || (sp.siap === "1" && remaining === 0);
  const firstName = ctx.session.name.split(" ")[0];
  const sport = sportOf(ctx.sport);

  return (
    <div className="grid gap-5">
      {/* Kepala halaman ringkas: di HP maskot kecil di pojok, bukan blok besar yang mendorong isi ke bawah. */}
      <section className="rise relative overflow-hidden rounded-[2rem] bg-pitch px-5 pt-6 pb-5 text-white sm:px-10 sm:pt-10 sm:pb-10">
        <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -right-24 -bottom-28 w-[420px] text-white/[0.07]">
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
          <path d="M0 200 H400" stroke="currentColor" strokeWidth="10" />
        </svg>
        <span aria-hidden className="pointer-events-none absolute -top-10 left-[62%] hidden h-72 w-5 -rotate-[24deg] bg-ember/90 md:block lg:w-7" />
        <span aria-hidden className="pointer-events-none absolute -top-10 left-[calc(62%+3rem)] hidden h-72 w-2 -rotate-[24deg] bg-ember/50 md:block" />
        <div aria-hidden className={`pointer-events-none absolute top-3 right-3 w-20 sm:top-auto sm:right-8 sm:bottom-0 sm:w-56 lg:w-72 ${celebrate ? "pop" : ""}`}>
          <Maskot priority variant={sport.mascot} className="maskot-float drop-shadow-maskot" />
        </div>
        <div className="relative min-w-0 pr-20 sm:max-w-[55%] sm:pr-0">
          <p className="text-sm font-semibold text-white/70 sm:text-base">{justCreated ? "Akademi berhasil dibuat" : justJoined ? `Selamat bergabung, ${firstName}` : celebrate ? "Persiapan selesai" : `Halo, ${firstName}`}</p>
          <h1 className="mt-0.5 text-2xl leading-tight font-extrabold tracking-tight text-balance sm:mt-1 sm:text-5xl">{academy.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70 sm:mt-2 sm:text-base">
            <span>{sport.label}{academy.city ? `, ${academy.city}` : ""}</span>
            <span className="rounded-full bg-white/12 px-2.5 py-0.5 text-xs font-extrabold tracking-wider text-white select-all sm:text-sm">ID {formatBusinessCode(academy.code)}</span>
          </p>
        </div>
        <nav aria-label="Pintasan" className="relative -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <Link href="/jadwal" className="inline-flex h-11 shrink-0 items-center rounded-full bg-ember px-5 font-extrabold text-ink transition hover:-translate-y-0.5 hover:brightness-110">
            Absen latihan
          </Link>
          {ctx.can("players.manage") ? (
            <Link href="/pemain/baru" className="inline-flex h-11 shrink-0 items-center rounded-full bg-white/12 px-5 font-bold text-white transition hover:bg-white/20">
              Tambah pemain
            </Link>
          ) : null}
          {billing ? (
            <Link href="/iuran" className="inline-flex h-11 shrink-0 items-center rounded-full bg-white/12 px-5 font-bold text-white transition hover:bg-white/20">
              Iuran
            </Link>
          ) : null}
          <Link href="/pengumuman" className="inline-flex h-11 shrink-0 items-center rounded-full bg-white/12 px-5 font-bold text-white transition hover:bg-white/20">
            Pengumuman
          </Link>
        </nav>
      </section>

      {canSetUp && remaining > 0 ? (
        <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-7" aria-labelledby="persiapan">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="persiapan" className="text-lg font-extrabold sm:text-xl">Persiapan akademi</h2>
            <p className="text-sm font-bold text-ink-soft">{steps.length - remaining} dari {steps.length}</p>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {steps.map((st) => (
              <span key={st.id} className={`h-2 flex-1 rounded-full ${st.done ? "bg-pitch" : "bg-mist"}`} />
            ))}
          </div>
          {nextStep ? (
            <Link
              href={`${nextStep.href}?dari=persiapan`}
              className="group mt-4 flex items-center gap-4 rounded-2xl bg-pitch p-4 text-white transition hover:-translate-y-0.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white/70">Langkah berikutnya</span>
                <span className="block text-lg font-extrabold">{nextStep.title}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-ember transition group-hover:translate-x-0.5" />
            </Link>
          ) : null}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            {steps.map((st) => (
              <li key={st.id} className="flex items-center gap-1.5">
                {st.done ? <CircleCheck aria-hidden className="size-4 text-turf" /> : <span aria-hidden className="size-4 rounded-full border-2 border-ink-soft/40" />}
                <span className={st.done ? "line-through decoration-ink-soft/40" : "font-semibold text-ink"}>{st.title}</span>
              </li>
            ))}
          </ul>
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

      <MatchWidget overview={matches} />

      {stats.activePlayers > 0 ? <StatTiles stats={stats} billing={billing} /> : null}

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

      <AttendanceWidgets stats={stats} />
    </div>
  );
}
