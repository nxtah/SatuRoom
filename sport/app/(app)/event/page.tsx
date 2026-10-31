import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { rupiah } from "@/lib/money";
import { inAcademy } from "@/server/context";
import { listEvents } from "@/server/events";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { EventForm, STATUS_LABEL, STATUS_TONE } from "./parts";

export const metadata: Metadata = { title: "Event" };

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default async function EventPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("events")) redirect("/");
  const [events, today] = await Promise.all([listEvents(ctx), inAcademy(ctx, academyToday)]);
  const manage = ctx.can("events.manage");

  return (
    <div className="max-w-5xl">
      <PageHeader title="Event dan turnamen" subtitle="Coaching clinic, trial, liburan, turnamen. Orang tua bisa mendaftar dari akun pemain." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        {manage ? <EventForm today={today} /> : null}
        <section className="grid gap-3">
          {events.length === 0 ? <EmptyState title="Belum ada event">Buat event pertama, lalu klik Buka pendaftaran supaya orang tua bisa mendaftar.</EmptyState> : null}
          {events.map((e) => (
            <Link key={e.id} href={`/event/${e.id}`} className="rise block rounded-[1.5rem] bg-chalk p-5 transition hover:-translate-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-lg font-extrabold break-words">{e.title}</span>
                {e.kind === "tournament" ? <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold">Turnamen</span> : null}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {fmt(e.startsOn)}{e.endsOn !== e.startsOn ? ` - ${fmt(e.endsOn)}` : ""}{e.place ? ` · ${e.place}` : ""} · {e.fee ? rupiah(e.fee) : "Gratis"}
              </p>
              <p className="mt-1 text-sm font-bold">
                {e.participants} peserta{e.capacity ? ` dari ${e.capacity}` : ""}{e.fee ? ` · ${e.paid} lunas` : ""}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
