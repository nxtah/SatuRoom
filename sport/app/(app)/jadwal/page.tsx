import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SessionCard } from "@/components/session-card";
import { ButtonLink } from "@/components/ui/button";
import { addDays, dayLabel, dayOfMonth, shortDay, weekLabel } from "@/lib/dates";
import { inAcademy } from "@/server/context";
import { isIsoDate, isUuid } from "@/server/ids";
import { requireAcademyPage } from "@/server/routing";
import { academyToday, canPlan, listSchedules, listSessions, mondayOf } from "@/server/schedule";
import { listTeams } from "@/server/teams";

export const metadata: Metadata = { title: "Jadwal" };

export default async function JadwalPage({ searchParams }: { searchParams: Promise<{ minggu?: string; tim?: string }> }) {
  const ctx = await requireAcademyPage();
  const sp = await searchParams;
  const today = await inAcademy(ctx, academyToday);
  const monday = mondayOf(isIsoDate(sp.minggu) ? sp.minggu : today);
  const sunday = addDays(monday, 6);
  const teamId = isUuid(sp.tim) ? sp.tim : undefined;
  const [teams, sessions, schedules] = await Promise.all([
    listTeams(ctx),
    listSessions(ctx, { from: monday, to: sunday, teamId }),
    listSchedules(ctx),
  ]);
  const plan = canPlan(ctx, teams.length);

  const href = (next: { minggu?: string; tim?: string | null }) => {
    const p = new URLSearchParams();
    const week = next.minggu ?? monday;
    if (week !== mondayOf(today)) p.set("minggu", week);
    const tim = next.tim === null ? undefined : (next.tim ?? teamId);
    if (tim) p.set("tim", tim);
    const s = p.toString();
    return s ? `/jadwal?${s}` : "/jadwal";
  };

  const actions = plan ? (
    <div className="flex flex-wrap gap-2">
      <ButtonLink href="/jadwal/rutin" variant="outline">
        <Repeat aria-hidden className="size-4" /> Jadwal rutin
      </ButtonLink>
      <ButtonLink href="/jadwal/baru">
        <Plus aria-hidden className="size-5" /> Tambah sesi
      </ButtonLink>
    </div>
  ) : null;

  if (teams.length === 0) {
    return (
      <>
        <PageHeader title="Jadwal" />
        <EmptyState
          title="Belum ada tim"
          action={ctx.can("teams.manage") ? <ButtonLink href="/tim/baru">Buat tim</ButtonLink> : null}
        >
          Jadwal latihan dibuat per tim. Setelah ada tim, atur jadwal rutinnya di sini.
        </EmptyState>
      </>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const chip = (on: boolean) =>
    `inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold transition ${
      on ? "bg-pitch text-white" : "bg-chalk text-ink-soft hover:text-ink"
    }`;

  return (
    <>
      <PageHeader title="Jadwal" action={actions} />

      <div className="rise mb-4 flex items-center gap-2">
        <Link href={href({ minggu: addDays(monday, -7) })} aria-label="Minggu sebelumnya" className="grid size-11 place-items-center rounded-full bg-chalk hover:bg-white">
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <p className="min-w-0 flex-1 text-center text-lg font-extrabold">{weekLabel(monday, sunday)}</p>
        <Link href={href({ minggu: addDays(monday, 7) })} aria-label="Minggu berikutnya" className="grid size-11 place-items-center rounded-full bg-chalk hover:bg-white">
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      </div>

      <ol className="rise mb-4 grid grid-cols-7 gap-1.5" aria-label="Hari dalam minggu ini">
        {days.map((d) => {
          const count = sessions.filter((s) => s.date === d && s.status !== "cancelled").length;
          const isToday = d === today;
          return (
            <li key={d}>
              <a
                href={`#hari-${d}`}
                className={`flex flex-col items-center rounded-2xl py-2 transition ${isToday ? "bg-ember text-ink" : "bg-chalk hover:bg-white"}`}
              >
                <span className={`text-xs font-bold ${isToday ? "" : "text-ink-soft"}`}>{shortDay(d)}</span>
                <span className="text-lg font-extrabold">{dayOfMonth(d)}</span>
                <span className="flex h-1.5 gap-0.5" aria-label={`${count} sesi`}>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span key={i} className={`size-1.5 rounded-full ${isToday ? "bg-ink" : "bg-turf"}`} />
                  ))}
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      {teams.length > 1 ? (
        <nav aria-label="Saring tim" className="rise -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link href={href({ tim: null })} className={chip(!teamId)} aria-current={!teamId ? "true" : undefined}>
            Semua tim
          </Link>
          {teams.map((t) => (
            <Link key={t.id} href={href({ tim: t.id })} className={chip(teamId === t.id)} aria-current={teamId === t.id ? "true" : undefined}>
              {t.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {schedules.length === 0 && sessions.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal latihan"
          action={plan ? <ButtonLink href="/jadwal/rutin">Atur jadwal rutin</ButtonLink> : null}
        >
          Atur sekali, misalnya tiap Selasa dan Kamis jam 15.30. Sesi latihan muncul otomatis setiap minggu.
        </EmptyState>
      ) : (
        <div className="grid gap-5">
          {days.map((d) => {
            const list = sessions.filter((s) => s.date === d);
            return (
              <section key={d} id={`hari-${d}`} aria-labelledby={`judul-${d}`} className="scroll-mt-24">
                <h2 id={`judul-${d}`} className={`mb-2 text-sm font-extrabold ${d === today ? "text-ember-deep" : "text-ink-soft"}`}>
                  {d === today ? `Hari ini, ${dayLabel(d)}` : dayLabel(d)}
                </h2>
                {list.length ? (
                  <ul className="grid gap-2">
                    {list.map((s) => (
                      <li key={s.id}>
                        <SessionCard s={s} today={today} action />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-[1.5rem] border-2 border-dashed border-line px-4 py-3 text-sm text-ink-soft">Tidak ada sesi</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
