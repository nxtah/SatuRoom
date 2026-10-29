import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { FormChip } from "@/components/scoreboard";
import { dayLabel } from "@/lib/dates";
import type { MatchesOverview } from "@/server/matches";

const HOME_AWAY = { home: "Kandang", away: "Tandang", neutral: "Netral" } as const;

/** Beranda: pertandingan berikutnya dan performa terakhir. Data dari hasil yang diisi pelatih. */
export function MatchWidget({ overview }: { overview: MatchesOverview }) {
  const { next, recent, record } = overview;
  if (!next && recent.length === 0) return null;
  const played = record.w + record.d + record.l;
  return (
    <section className="rise grid gap-3 lg:grid-cols-[1.1fr_0.9fr]" aria-labelledby="pertandingan">
      <h2 id="pertandingan" className="sr-only">Pertandingan</h2>
      {next ? (
        <Link href={`/jadwal/${next.sessionId}`} className="group relative overflow-hidden rounded-[2rem] bg-pitch p-5 text-white transition hover:-translate-y-0.5 sm:p-6">
          <span aria-hidden className="pointer-events-none absolute -top-6 right-8 h-40 w-3 -rotate-[24deg] bg-ember/70" />
          <p className="text-sm font-bold text-ember">Pertandingan berikutnya</p>
          <p className="mt-2 text-2xl leading-tight font-extrabold sm:text-3xl">{next.opponent ? `vs ${next.opponent}` : "Lawan belum diisi"}</p>
          <p className="mt-1 text-white/75">{next.teamName}, {HOME_AWAY[next.homeAway]}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/85">
            <span>{dayLabel(next.date)}, {next.startTime}</span>
            <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-4" />{next.locationName}</span>
          </p>
          <ChevronRight aria-hidden className="absolute right-5 bottom-5 size-5 text-white/60 transition group-hover:translate-x-0.5" />
        </Link>
      ) : null}
      {recent.length ? (
        <div className="rounded-[2rem] bg-chalk p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-extrabold">Performa terakhir</h3>
            <p className="text-sm font-bold text-ink-soft">{played} laga</p>
          </div>
          <ul className="mt-4 flex gap-2" aria-label="Hasil terbaru, dari yang terbaru">
            {recent.map((r) => (
              <li key={r.sessionId}>
                <Link href={`/jadwal/${r.sessionId}`} title={`${r.teamName} ${r.scoreUs}-${r.scoreThem} ${r.opponent ?? ""}`} className="block rounded-full transition hover:-translate-y-0.5">
                  <FormChip result={r.result} className="size-10 !text-base ring-2 ring-line" />
                </Link>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[["Menang", record.w], ["Seri", record.d], ["Kalah", record.l]].map(([label, n]) => (
              <div key={label} className="rounded-2xl bg-mist p-3">
                <dd className="text-2xl font-extrabold tabular-nums">{n}</dd>
                <dt className="text-xs font-bold text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-ink-soft">Gol atau poin: {record.goalsFor} untuk, {record.goalsAgainst} lawan.</p>
        </div>
      ) : null}
    </section>
  );
}
