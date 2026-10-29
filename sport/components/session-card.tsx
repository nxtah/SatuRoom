import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { dayOfMonth, shortDay } from "@/lib/dates";
import { resultOf } from "@/server/matches-shared";
import type { SessionRow } from "@/server/schedule";

/** Kartu sesi di kalender dan Beranda: jam, tim, dan status absensinya. */
export function SessionCard({
  s,
  today,
  action,
  withDate,
}: {
  s: SessionRow;
  today: string;
  action?: boolean;
  /** Untuk daftar lintas hari (halaman tim/pemain): tanggal di kiri, jam di baris kedua. */
  withDate?: boolean;
}) {
  const cancelled = s.status === "cancelled";
  const future = s.date > today;
  const recorded = s.recordedCount > 0;
  const result = s.kind === "match" ? resultOf(s.scoreUs, s.scoreThem) : null;
  const status = cancelled
    ? { text: "Dibatalkan", tone: "text-[#b42318]" }
    : result
      ? { text: `${{ W: "Menang", D: "Seri", L: "Kalah" }[result]} ${s.scoreUs}-${s.scoreThem}`, tone: result === "L" ? "text-[#b42318]" : "text-turf" }
      : recorded
      ? { text: `${s.presentCount} dari ${Math.max(s.rosterCount, s.recordedCount)} hadir`, tone: "text-turf" }
      : future
        ? { text: `${s.rosterCount} pemain`, tone: "text-ink-soft" }
        : { text: "Belum diabsen", tone: "text-ember-deep" };

  return (
    <Link
      href={`/jadwal/${s.id}`}
      className={`group flex items-center gap-4 rounded-[1.5rem] p-4 transition ${withDate ? "bg-mist/70" : "bg-chalk"} hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgb(11_26_58/0.5)] ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      {withDate ? (
        <span className={`w-12 shrink-0 text-center ${cancelled ? "line-through" : ""}`}>
          <span className="block text-xs font-bold text-ink-soft">{shortDay(s.date)}</span>
          <span className="block text-2xl leading-tight font-extrabold">{dayOfMonth(s.date)}</span>
        </span>
      ) : (
        <span className={`w-14 shrink-0 text-center ${cancelled ? "line-through" : ""}`}>
          <span className="block text-lg leading-tight font-extrabold">{s.startTime}</span>
          <span className="block text-xs font-semibold text-ink-soft">{s.endTime}</span>
        </span>
      )}
      <span aria-hidden className={`h-10 w-1 shrink-0 rounded-full ${s.kind === "match" ? "bg-ember" : "bg-turf"}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">
          {s.kind === "match" ? (s.opponent ? `vs ${s.opponent}` : (s.title ?? "Pertandingan")) : s.teamName}
        </span>
        <span className="block truncate text-sm">
          {withDate ? <span className="text-ink-soft">{s.startTime}–{s.endTime}, </span> : null}
          {s.kind === "match" ? <span className="text-ink-soft">{s.teamName}, </span> : s.title ? <span className="text-ink-soft">{s.title}, </span> : null}
          <span className={`font-bold ${status.tone}`}>{status.text}</span>
        </span>
      </span>
      {action && !cancelled && !future ? (
        <span className="shrink-0 rounded-full bg-ember px-4 py-2 text-sm font-extrabold text-ink transition group-hover:brightness-110">
          {recorded ? "Lihat" : "Absen"}
        </span>
      ) : (
        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}
