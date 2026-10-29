"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Scoreboard } from "@/components/scoreboard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { MatchInput } from "@/lib/schemas";
import { positionLabel, type SportId } from "@/lib/sports";
import { useForm } from "@/lib/use-form";
import type { HomeAway, LineupRole, MatchDetail, MatchRosterEntry } from "@/server/matches";
import { resultOf } from "@/server/matches-shared";

const HOME_AWAY: { id: HomeAway; label: string }[] = [
  { id: "home", label: "Kandang" },
  { id: "away", label: "Tandang" },
  { id: "neutral", label: "Netral" },
];

const ROLE_OPTIONS: { id: LineupRole | "none"; label: string }[] = [
  { id: "none", label: "Tidak" },
  { id: "starter", label: "Inti" },
  { id: "bench", label: "Cadangan" },
];

const chip = "flex h-10 cursor-pointer items-center rounded-full border-2 border-line bg-chalk px-4 text-sm font-bold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pitch-2";

/** Papan skor dan susunan pemain. Staf yang berhak bisa mengisi lawan, skor, catatan, dan siapa yang main. */
export function MatchPanel({
  sessionId,
  teamName,
  sport,
  detail,
  roster,
  canEdit,
  cancelled,
}: {
  sessionId: string;
  teamName: string;
  sport: SportId;
  detail: MatchDetail;
  roster: MatchRosterEntry[];
  canEdit: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const form = useForm(MatchInput);
  const [saved, setSaved] = useState(false);
  const [opponent, setOpponent] = useState(detail.opponent ?? "");
  const [scoreUs, setScoreUs] = useState(detail.scoreUs?.toString() ?? "");
  const [scoreThem, setScoreThem] = useState(detail.scoreThem?.toString() ?? "");
  const [lineup, setLineup] = useState<Record<string, LineupRole | undefined>>(
    Object.fromEntries(roster.filter((r) => r.role).map((r) => [r.playerId, r.role!])),
  );
  const counts = useMemo(() => {
    const v = Object.values(lineup);
    return { starter: v.filter((x) => x === "starter").length, bench: v.filter((x) => x === "bench").length };
  }, [lineup]);
  const liveResult = resultOf(scoreUs === "" ? null : Number(scoreUs), scoreThem === "" ? null : Number(scoreThem));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const data = new FormData(e.currentTarget);
    const done = await form.submit(
      {
        opponent,
        homeAway: data.get("homeAway"),
        scoreUs,
        scoreThem,
        report: data.get("report"),
        lineup: Object.entries(lineup).filter(([, role]) => role).map(([playerId, role]) => ({ playerId, role })),
      },
      (input) => api<void>(`/sessions/${sessionId}/match`, { method: "PUT", body: input }),
    );
    if (!done) return;
    setSaved(true);
    router.refresh();
  }

  const starters = roster.filter((r) => lineup[r.playerId] === "starter");
  const bench = roster.filter((r) => lineup[r.playerId] === "bench");

  return (
    <section className="rise mb-5 grid gap-4" aria-label="Pertandingan">
      <Scoreboard teamName={teamName} opponent={opponent || null} scoreUs={scoreUs === "" ? null : Number(scoreUs)} scoreThem={scoreThem === "" ? null : Number(scoreThem)} result={liveResult} />

      {!canEdit ? (
        <>
          {detail.report ? <p className="rounded-[1.5rem] bg-chalk p-5 text-ink-soft">{detail.report}</p> : null}
          {starters.length + bench.length ? (
            <div className="rounded-[1.5rem] bg-chalk p-5">
              <h2 className="font-extrabold">Susunan pemain</h2>
              <LineupList title="Inti" players={starters} sport={sport} />
              <LineupList title="Cadangan" players={bench} sport={sport} />
            </div>
          ) : null}
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate aria-label="Detail pertandingan" className="grid gap-5 rounded-[2rem] bg-chalk p-5 sm:p-7">
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          {saved ? <Alert tone="success">Pertandingan tersimpan.</Alert> : null}
          {cancelled ? <Alert tone="info">Pertandingan ini dibatalkan, jadi tidak bisa diubah.</Alert> : null}
          <fieldset disabled={cancelled} className="grid min-w-0 gap-5">
            <Field label="Lawan" name="opponent" value={opponent} onChange={(e) => { setOpponent(e.target.value); setSaved(false); }} placeholder="Contoh: SSB Persib Muda" error={form.fields.opponent} />
            <fieldset>
              <legend className="mb-2 text-sm font-bold">Tempat</legend>
              <div className="flex flex-wrap gap-2">
                {HOME_AWAY.map((h) => (
                  <label key={h.id}>
                    <input type="radio" name="homeAway" value={h.id} defaultChecked={detail.homeAway === h.id} className="peer sr-only" />
                    <span className={chip}>{h.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Skor ${teamName}`} name="scoreUs" inputMode="numeric" value={scoreUs} onChange={(e) => { setScoreUs(e.target.value); setSaved(false); }} error={form.fields.scoreUs} />
              <Field label="Skor lawan" name="scoreThem" inputMode="numeric" value={scoreThem} onChange={(e) => { setScoreThem(e.target.value); setSaved(false); }} error={form.fields.scoreThem} />
            </div>
            <div>
              <label htmlFor="report" className="mb-2 block text-sm font-bold">Catatan pertandingan (boleh kosong)</label>
              <textarea id="report" name="report" rows={3} maxLength={500} defaultValue={detail.report ?? ""} placeholder="Contoh: Set 1 25-20, set 2 22-25, set 3 25-18." onChange={() => setSaved(false)} className="w-full rounded-2xl border-2 border-line bg-chalk p-4 text-base outline-none placeholder:text-ink-soft/60 focus:border-pitch" />
              {form.fields.report ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.report}</p> : null}
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold">Susunan pemain</h2>
                <p className="text-sm font-semibold text-ink-soft" aria-live="polite">{counts.starter} inti, {counts.bench} cadangan</p>
              </div>
              <ul className="grid gap-2">
                {roster.map((p) => {
                  const current = lineup[p.playerId] ?? "none";
                  const pos = positionLabel(sport, p.position);
                  return (
                    <li key={p.playerId} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-mist/70 p-3">
                      <span className="min-w-0 flex-1 basis-40">
                        <span className="block truncate font-bold">{p.shirtNumber ? `${p.shirtNumber}. ` : ""}{p.fullName}</span>
                        <span className="block text-xs text-ink-soft">{[pos, p.attendance === "absent" ? "Alpa" : p.attendance === "sick" ? "Sakit" : p.attendance === "excused" ? "Izin" : null].filter(Boolean).join(", ") || " "}</span>
                      </span>
                      <span role="radiogroup" aria-label={`Peran ${p.fullName}`} className="flex gap-1">
                        {ROLE_OPTIONS.map((o) => (
                          <label key={o.id}>
                            <input type="radio" name={`role-${p.playerId}`} checked={current === o.id} onChange={() => { setLineup((l) => ({ ...l, [p.playerId]: o.id === "none" ? undefined : o.id })); setSaved(false); }} className="peer sr-only" />
                            <span className={`${chip} h-9 px-3 text-[13px]`}>{o.label}</span>
                          </label>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {form.fields.lineup ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.lineup}</p> : null}
            </div>
            <Button type="submit" disabled={form.pending} className="justify-self-start">{form.pending ? "Menyimpan…" : "Simpan pertandingan"}</Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}

function LineupList({ title, players, sport }: { title: string; players: MatchRosterEntry[]; sport: SportId }) {
  if (!players.length) return null;
  return (
    <div className="mt-3">
      <h3 className="text-sm font-bold text-ink-soft">{title}</h3>
      <ul className="mt-1 flex flex-wrap gap-2">
        {players.map((p) => (
          <li key={p.playerId} className="rounded-full bg-mist px-3 py-1.5 text-sm font-bold">
            {p.shirtNumber ? `${p.shirtNumber} ` : ""}{p.fullName}
            {positionLabel(sport, p.position) ? <span className="font-medium text-ink-soft"> ({positionLabel(sport, p.position)})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
