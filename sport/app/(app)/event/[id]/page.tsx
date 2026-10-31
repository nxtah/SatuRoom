import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { rupiah } from "@/lib/money";
import { inAcademy } from "@/server/context";
import { AppError } from "@/server/errors";
import { getEvent } from "@/server/events";
import { listPlayers } from "@/server/players";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { listTeams } from "@/server/teams";
import { STATUS_LABEL, STATUS_TONE } from "../parts";
import { EventActions, Participants, Tournament } from "./parts";

export const metadata: Metadata = { title: "Detail event" };

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("events")) redirect("/");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getEvent(ctx, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const manage = ctx.can("events.manage");
  const [players, teams, today] = await Promise.all([manage ? listPlayers(ctx, {}) : [], data.event.kind === "tournament" && manage ? listTeams(ctx) : [], inAcademy(ctx, academyToday)]);
  const e = data.event;

  return (
    <div className="max-w-5xl">
      <Link href="/event" className="rise inline-flex text-sm font-bold text-ink-soft hover:text-ink">‹ Semua event</Link>
      <header className="rise mt-2 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 text-3xl font-extrabold tracking-tight break-words sm:text-4xl">{e.title}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS_TONE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
        </div>
        <p className="mt-1 text-ink-soft">
          {fmt(e.startsOn)}{e.endsOn !== e.startsOn ? ` sampai ${fmt(e.endsOn)}` : ""}{e.place ? ` · ${e.place}` : ""} · {e.fee ? rupiah(e.fee) : "Gratis"}
        </p>
        {e.description ? <p className="mt-2 max-w-2xl whitespace-pre-line">{e.description}</p> : null}
      </header>
      {manage ? <EventActions event={e} today={today} /> : null}
      <div className="mt-5 grid gap-5">
        {e.kind === "tournament" ? (
          <Tournament eventId={e.id} manage={manage} teams={data.teams} fixtures={data.fixtures} standings={data.standings} ownTeams={teams.map((t) => ({ id: t.id, name: t.name }))} today={today} />
        ) : null}
        <Participants
          event={e}
          participants={data.participants}
          manage={manage}
          canPay={ctx.can("billing.manage")}
          today={today}
          players={players.filter((p) => p.status === "active" && !data.participants.some((x) => x.playerId === p.id && x.status !== "cancelled")).map((p) => ({ id: p.id, name: p.fullName }))}
        />
      </div>
    </div>
  );
}
