import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { WEEKDAYS } from "@/lib/schemas";
import { listLocations } from "@/server/locations";
import { inAcademy } from "@/server/context";
import { requireAcademyPage } from "@/server/routing";
import { academyToday, canPlan, listSchedules } from "@/server/schedule";
import { listTeams } from "@/server/teams";
import { ScheduleForm } from "./schedule-form";
import { StopButton } from "./stop-button";

export const metadata: Metadata = { title: "Jadwal rutin" };

const addMinutes = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const t = (h * 60 + m + min) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export default async function JadwalRutinPage({ searchParams }: { searchParams: Promise<{ dari?: string; tim?: string }> }) {
  const ctx = await requireAcademyPage();
  const [teams, schedules, today, locations] = await Promise.all([listTeams(ctx), listSchedules(ctx), inAcademy(ctx, academyToday), listLocations(ctx)]);
  if (!canPlan(ctx, teams.length)) redirect("/jadwal");
  const sp = await searchParams;
  const fromSetup = sp.dari === "persiapan";
  const byTeam = teams
    .map((t) => ({ team: t, rows: schedules.filter((s) => s.teamId === t.id) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Jadwal rutin"
        subtitle="Atur sekali, sesi latihan muncul otomatis setiap minggu."
        back={fromSetup ? { href: "/", label: "Beranda" } : { href: "/jadwal", label: "Jadwal" }}
      />

      {byTeam.length ? (
        <section className="rise mb-5 grid gap-3" aria-label="Jadwal yang berjalan">
          {byTeam.map(({ team, rows }) => (
            <div key={team.id} className="rounded-[2rem] bg-chalk p-5 sm:p-6">
              <h2 className="text-lg font-extrabold">{team.name}</h2>
              <ul className="mt-2 grid gap-1">
                {rows.map((s) => {
                  const label = `${WEEKDAYS[s.weekday - 1]!.label} ${s.startTime}-${addMinutes(s.startTime, s.durationMin)}`;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-mist px-4 py-2">
                      <span className="font-bold">{label}</span>
                      <StopButton id={s.id} label={`${team.name} ${label}`} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="tambah">
        <h2 id="tambah" className="mb-5 text-xl font-extrabold">
          {byTeam.length ? "Tambah jadwal" : "Jadwal pertama"}
        </h2>
        <ScheduleForm
          teams={teams}
          locations={locations}
          today={today}
          defaultTeamId={teams.some((t) => t.id === sp.tim) ? sp.tim : undefined}
          next={fromSetup ? "/?siap=1" : "/jadwal"}
        />
      </section>
    </div>
  );
}
