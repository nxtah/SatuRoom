import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ageOf, ageRangeLabel } from "@/lib/age";
import { AppError } from "@/server/errors";
import { listPlayers } from "@/server/players";
import { requireAcademyPage } from "@/server/routing";
import { getTeam } from "@/server/teams";
import { SessionCard } from "@/components/session-card";
import { rupiah } from "@/lib/money";
import { inAcademy } from "@/server/context";
import { listTeamFees } from "@/server/fees";
import { academyToday, addDays, listSessions } from "@/server/schedule";
import { homeStats } from "@/server/stats";

export const metadata: Metadata = { title: "Tim" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  const team = await getTeam(ctx, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const today = await inAcademy(ctx, academyToday);
  const [players, sessions, stats, fees] = await Promise.all([
    listPlayers(ctx, { teamId: id }),
    listSessions(ctx, { from: today, to: addDays(today, 14), teamId: id }),
    homeStats(ctx),
    ctx.can("billing.read") ? listTeamFees(ctx) : null,
  ]);
  const upcoming = sessions.filter((s) => s.status === "scheduled").slice(0, 3);
  const rate = stats.perTeam.find((t) => t.teamId === id)?.rate ?? null;
  const fee = fees?.find((f) => f.teamId === id);
  const range = ageRangeLabel(team.ageMin, team.ageMax);

  return (
    <>
      <PageHeader
        title={team.name}
        subtitle={[
          range,
          team.coaches.length
            ? `Pelatih: ${team.coaches.join(", ")}`
            : "Belum ada pelatih",
        ]
          .filter(Boolean)
          .join(". ")}
        back={{ href: "/tim", label: "Tim" }}
        action={
          ctx.can("teams.manage") ? (
            <ButtonLink href={`/tim/${id}/ubah`} variant="outline">
              <Pencil aria-hidden className="size-4" /> Ubah
            </ButtonLink>
          ) : null
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <section
          className="rise rounded-[2rem] bg-chalk p-6 sm:p-8"
          aria-labelledby="pemain-tim"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="pemain-tim" className="text-xl font-extrabold">
              {players.length} pemain
            </h2>
            {ctx.can("players.manage") ? (
              <ButtonLink href={`/pemain/baru?tim=${id}`} size="sm">
                <Plus aria-hidden className="size-4" /> Tambah pemain
              </ButtonLink>
            ) : null}
          </div>
          {players.length === 0 ? (
            <p className="mt-4 text-ink-soft">Belum ada pemain di tim ini.</p>
          ) : (
            <ul className="mt-4 grid gap-1">
              {players.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pemain/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-mist"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pitch text-sm font-extrabold text-white">
                      {p.shirtNumber ?? p.fullName[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {p.fullName}
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">
                      {ageOf(p.birthDate)} th
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rise grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
            <Link
              href={`/jadwal?tim=${id}`}
              className="rounded-[1.75rem] bg-sun p-5 transition hover:-translate-y-0.5"
            >
              <span className="text-sm font-bold text-ink/70">
                Kehadiran 30 hari
              </span>
              <span className="mt-3 block text-3xl font-extrabold tracking-tight">
                {rate === null ? "-" : `${rate}%`}
              </span>
            </Link>
            {fee ? (
              <Link
                href="/iuran"
                className="rounded-[1.75rem] bg-chalk p-5 transition hover:-translate-y-0.5"
              >
                <span className="text-sm font-bold text-ink-soft">
                  Iuran per bulan
                </span>
                <span className="mt-3 block text-2xl font-extrabold tracking-tight">
                  {fee.amount === null ? "Belum diatur" : rupiah(fee.amount)}
                </span>
              </Link>
            ) : (
              <div className="rounded-[1.75rem] bg-chalk p-5">
                <span className="text-sm font-bold text-ink-soft">
                  Pemain aktif
                </span>
                <span className="mt-3 block text-3xl font-extrabold tracking-tight">
                  {players.length}
                </span>
              </div>
            )}
          </div>

          <section
            className="rise rounded-[2rem] bg-chalk p-6 sm:col-span-2 lg:col-span-1"
            aria-labelledby="jadwal-tim"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="jadwal-tim" className="font-extrabold">
                Jadwal berikutnya
              </h2>
              <Link
                href={`/jadwal?tim=${id}`}
                className="text-sm font-bold text-ink-soft hover:text-ink"
              >
                Semua jadwal
              </Link>
            </div>
            {upcoming.length ? (
              <div className="mt-3 grid gap-2">
                {upcoming.map((s) => (
                  <SessionCard key={s.id} s={s} today={today} withDate />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-ink-soft">
                Belum ada latihan dalam dua minggu ke depan.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
