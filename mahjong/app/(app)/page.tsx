import { Armchair, CalendarClock, Trophy, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Bars } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { Tile } from "@/components/tiles";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { dayLabel, shortDay } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { homeStats } from "@/server/reports";
import { requireVenuePage } from "@/server/routing";
import { listTournaments } from "@/server/tournaments";
import { getVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Beranda" };

export default async function Beranda({ searchParams }: { searchParams: Promise<{ selamat?: string }> }) {
  const ctx = await requireVenuePage();
  const [stats, venue, sp] = await Promise.all([homeStats(ctx), getVenue(ctx), searchParams]);
  const tournaments = ctx.can("tournaments.read") ? (await listTournaments(ctx)).filter((t) => t.status !== "done").slice(0, 2) : [];
  const showMoney = ctx.can("reports.read");
  const tiles = [
    ...(ctx.can("floor.view") ? [{ href: "/meja", icon: Armchair, label: "Meja main", value: `${stats.playingNow}/${stats.tablesTotal}` }] : []),
    ...(ctx.can("bookings.manage") ? [{ href: "/booking", icon: CalendarClock, label: "Booking hari ini", value: String(stats.bookingsToday) }] : []),
    ...(ctx.can("members.read") ? [{ href: "/member", icon: UsersRound, label: "Member", value: String(stats.members) }] : []),
  ];

  return (
    <>
      <PageHeader title={venue.name} subtitle={dayLabel(stats.today)} action={ctx.can("floor.view") ? <ButtonLink href="/meja">Buka lantai</ButtonLink> : undefined} />
      {sp.selamat === "1" ? <div className="rise mb-4"><Alert tone="success">Tempat siap. Empat meja contoh sudah dibuat; ubah nama dan tarifnya di Lainnya, Meja.</Alert></div> : null}
      {sp.selamat === "gabung" ? <div className="rise mb-4"><Alert tone="success">Anda sudah bergabung. Menu di kiri menyesuaikan peran Anda.</Alert></div> : null}
      {stats.requests > 0 && ctx.can("bookings.manage") ? (
        <Link href="/booking" className="tile tile-press rise mb-4 flex items-center gap-3 border-sun p-4">
          <CalendarClock aria-hidden className="size-5 text-sun" />
          <span className="flex-1 font-bold">{stats.requests} permintaan booking dari link publik menunggu meja.</span>
          <span className="font-extrabold text-ember">Atur</span>
        </Link>
      ) : null}

      <div className="rise grid grid-cols-2 gap-3 sm:grid-cols-4">
        {showMoney ? (
          <div className="felt col-span-2 rounded-2xl p-5 text-white shadow-[0_4px_0_var(--color-night)] sm:col-span-1">
            <p className="text-sm font-bold text-white/70">Omzet hari ini</p>
            <p className="tnum mt-1 text-3xl font-extrabold">{rupiah(stats.revenueToday)}</p>
            <p className="mt-1 text-sm text-white/70">{stats.sessionsToday} sesi selesai</p>
          </div>
        ) : null}
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="tile tile-press p-5">
            <t.icon aria-hidden className="size-5 text-ember" />
            <p className="tnum mt-3 text-3xl font-extrabold">{t.value}</p>
            <p className="text-sm font-semibold text-ink-soft">{t.label}</p>
          </Link>
        ))}
      </div>

      {stats.week ? (
        <section className="tile rise mt-5 p-5" aria-labelledby="mingguan">
          <h2 id="mingguan" className="text-lg font-extrabold">7 hari terakhir</h2>
          <Bars items={stats.week.map((d) => ({ label: shortDay(d.date), value: d.revenue }))} format={rupiah} />
        </section>
      ) : null}

      {tournaments.length ? (
        <section className="rise mt-5" aria-labelledby="liga">
          <h2 id="liga" className="mb-2 text-lg font-extrabold">Turnamen berjalan</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link href={`/turnamen/${t.id}`} className="tile tile-press flex items-center gap-4 p-4">
                  <Tile face={{ kind: "glyph", text: "中" }} className="w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{t.name}</span>
                    <span className="block text-sm text-ink-soft">{dayLabel(t.eventDate)} · {t.players} peserta · babak {t.roundsPlayed}/{t.rounds}</span>
                  </span>
                  <Trophy aria-hidden className="size-5 text-sun" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
