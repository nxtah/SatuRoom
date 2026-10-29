import { CalendarX2, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { longDate } from "@/lib/dates";
import { getSessionSheet } from "@/server/attendance";
import { getMatch } from "@/server/matches";
import { AppError } from "@/server/errors";
import { isUuid } from "@/server/ids";
import { requireAcademyPage } from "@/server/routing";
import { AttendanceSheet } from "./attendance-sheet";
import { SessionActions } from "./session-actions";
import { QrScanner } from "./qr-scanner";
import { MatchPanel } from "./match-panel";

export const metadata: Metadata = { title: "Absensi" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sheet = await getSessionSheet(ctx, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const { session: s } = sheet;
  const match = s.kind === "match" ? await getMatch(ctx, id) : null;
  const title = s.kind === "match" ? (s.title ?? "Pertandingan") : (s.title ?? `Latihan ${s.teamName}`);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={title}
        subtitle={`${s.kind === "match" || s.title ? `${s.teamName}, ` : ""}${longDate(s.date)}, ${s.startTime}-${s.endTime}`}
        back={{ href: `/jadwal?minggu=${s.date}`, label: "Jadwal" }}
      />
      <p className="rise -mt-3 mb-5 inline-flex items-center gap-1.5 text-sm text-ink-soft">
        <MapPin aria-hidden className="size-4" /> {s.locationName}
      </p>

      {s.status === "cancelled" ? (
        <div className="rise mb-4 flex items-start gap-3 rounded-[1.5rem] bg-[#fdecec] p-5 text-[#912018]">
          <CalendarX2 aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-extrabold">Sesi dibatalkan</p>
            {s.cancelReason ? <p className="mt-0.5">{s.cancelReason}</p> : null}
          </div>
        </div>
      ) : sheet.blockedReason ? (
        <div className="rise mb-4">
          <Alert tone="info">{sheet.blockedReason}</Alert>
        </div>
      ) : null}

      {match ? (
        <MatchPanel
          sessionId={s.id}
          teamName={s.teamName}
          sport={ctx.sport}
          detail={match.detail}
          roster={match.roster}
          canEdit={match.canEdit}
          cancelled={s.status === "cancelled"}
        />
      ) : null}

      <section className="rise" aria-label="Absensi">
        {sheet.canRecord ? <QrScanner sessionId={s.id} /> : null}
        <AttendanceSheet sessionId={s.id} roster={sheet.roster} editable={sheet.canRecord} />
      </section>

      {sheet.canManage ? <SessionActions id={s.id} cancelled={s.status === "cancelled"} /> : null}
    </div>
  );
}
