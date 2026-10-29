"use client";

import { Crown, Shuffle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { TournamentDetail } from "@/server/tournaments";

const WINDS = ["東", "南", "西", "北"];

export function TournamentView({ t, members }: { t: TournamentDetail; members: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [memberId, setMemberId] = useState("");

  async function run(fn: () => ReturnType<typeof api>) {
    setBusy(true);
    setError(undefined);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
    return true;
  }

  const id = t.id;
  const taken = new Set(t.entrants.map((e) => e.memberId));
  const lastRound = t.rounds_.at(-1);
  const canNext = t.canManage && t.status !== "done" && t.rounds_.length < t.rounds && (!lastRound || lastRound.complete);
  const canFinish = t.canManage && t.status === "running" && t.rounds_.length === t.rounds && lastRound?.complete;
  const paid = t.entrants.filter((e) => e.paid).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid content-start gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}

        {t.rounds_.length ? t.rounds_.slice().reverse().map((r) => (
          <section key={r.roundNo} className="rise" aria-label={`Babak ${r.roundNo}`}>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">Babak {r.roundNo} {r.complete ? <span className="rounded-lg bg-turf-soft px-2 py-0.5 text-xs">Skor lengkap</span> : <span className="rounded-lg bg-[#f6e7bd] px-2 py-0.5 text-xs text-[#6b5314]">Menunggu skor</span>}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {r.tables.map((tb) => <ScoreTable key={tb.tableNo} tournamentId={id} roundNo={r.roundNo} table={tb} canScore={t.canScore && t.status === "running"} onSaved={() => router.refresh()} />)}
            </div>
          </section>
        )) : (
          <section className="tile rise p-6">
            <h2 className="text-lg font-extrabold">Belum ada babak</h2>
            <p className="mt-1 text-ink-soft">Daftarkan peserta, lalu buat babak pertama. Meja diundi otomatis (4 orang per meja, sisanya meja bertiga).</p>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {canNext ? <Button disabled={busy || t.entrants.length < 4} onClick={() => run(() => api(`/tournaments/${id}/rounds`, { method: "POST", body: {} }))}><Shuffle aria-hidden className="size-5" /> Undi babak {t.rounds_.length + 1}</Button> : null}
          {canFinish ? <Button variant="dark" disabled={busy} onClick={() => confirm("Tutup turnamen? Skor tidak bisa diubah lagi.") && run(() => api(`/tournaments/${id}/finish`, { method: "POST", body: {} }))}>Selesaikan turnamen</Button> : null}
        </div>
      </div>

      <aside className="grid content-start gap-5">
        <section className="tile rise p-5" aria-labelledby="klasemen">
          <h2 id="klasemen" className="flex items-center gap-2 text-lg font-extrabold"><Crown aria-hidden className="size-5 text-sun" /> Klasemen</h2>
          {t.rounds_.length ? (
            <ol className="tnum mt-3 divide-y divide-line">
              {t.standings.map((s) => (
                <li key={s.playerId} className="flex items-center gap-3 py-2.5">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${s.place === 1 ? "bg-sun text-ink" : "bg-mist"}`}>{s.place}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
                  <span className="text-right"><b>{s.rankPoints}</b> poin<span className="block text-xs text-ink-soft">{s.totalScore.toLocaleString("id-ID")} skor</span></span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-2 text-ink-soft">Muncul setelah babak pertama.</p>}
        </section>

        <section className="tile rise p-5" aria-labelledby="peserta">
          <h2 id="peserta" className="text-lg font-extrabold">Peserta ({t.entrants.length})</h2>
          <p className="text-sm text-ink-soft">{paid} lunas dari {t.entrants.length} · biaya {rupiah(t.entryFee)}</p>
          {t.entrants.length ? (
            <ul className="mt-2 divide-y divide-line">
              {t.entrants.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span>
                  {t.canManage ? (
                    <>
                      <label className="flex items-center gap-1.5 text-sm font-bold"><input type="checkbox" checked={e.paid} disabled={busy} onChange={(ev) => run(() => api(`/tournaments/${id}/entrants/${e.id}`, { method: "PATCH", body: { paid: ev.target.checked } }))} className="size-5 accent-[#0f3a2d]" /> Lunas</label>
                      {t.status === "draft" ? <button type="button" aria-label={`Hapus ${e.name}`} disabled={busy} onClick={() => run(() => api(`/tournaments/${id}/entrants/${e.id}`, { method: "DELETE" }))} className="grid size-9 place-items-center rounded-lg hover:bg-[#fdecec]"><Trash2 aria-hidden className="size-4" /></button> : null}
                    </>
                  ) : e.paid ? <span className="text-xs font-bold text-turf">Lunas</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {t.canManage && t.status === "draft" ? (
            <div className="mt-4 grid gap-3">
              {members.length ? (
                <div className="flex gap-2">
                  <select aria-label="Tambah dari member" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-chalk px-3">
                    <option value="">Dari member…</option>
                    {members.filter((m) => !taken.has(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <Button size="sm" disabled={!memberId || busy} onClick={() => run(() => api(`/tournaments/${id}/entrants`, { body: { memberId } })).then(() => setMemberId(""))}>Tambah</Button>
                </div>
              ) : null}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(() => api(`/tournaments/${id}/entrants`, { body: { name } })).then((ok) => ok && setName("")); }}>
                <input aria-label="Nama peserta" value={name} onChange={(e) => setName(e.target.value)} placeholder="Atau ketik nama peserta" maxLength={80} className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-chalk px-3 outline-none focus:border-pitch" />
                <Button size="sm" type="submit" disabled={!name.trim() || busy}>Tambah</Button>
              </form>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}

function ScoreTable({ tournamentId, roundNo, table, canScore, onSaved }: { tournamentId: string; roundNo: number; table: TournamentDetail["rounds_"][number]["tables"][number]; canScore: boolean; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(table.seats.map((s) => [s.playerId, s.score === null ? "" : String(s.score)])));
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string }>();
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(undefined);
    const r = await api(`/tournaments/${tournamentId}/scores`, { method: "PUT", body: { roundNo, tableNo: table.tableNo, scores: table.seats.map((s) => ({ playerId: s.playerId, score: values[s.playerId] === "" ? null : Number(values[s.playerId]) })) } });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error.message });
    setMsg({ tone: "success", text: "Tersimpan." });
    onSaved();
  }

  const sum = table.seats.reduce((n, s) => n + (Number(values[s.playerId]) || 0), 0);
  return (
    <div className="tile p-4">
      <p className="mb-2 text-sm font-extrabold text-ink-soft">Meja {table.tableNo}</p>
      <ul className="grid gap-2">
        {table.seats.map((s, i) => (
          <li key={s.playerId} className="flex items-center gap-2">
            <span aria-hidden className="cjk grid size-8 shrink-0 place-items-center rounded-lg bg-mist text-lg text-ember">{WINDS[i]}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
            {canScore ? <input aria-label={`Skor ${s.name}`} inputMode="numeric" value={values[s.playerId]} onChange={(e) => setValues({ ...values, [s.playerId]: e.target.value.replace(/[^\d-]/g, "") })} className="tnum h-10 w-24 rounded-lg border-2 border-line bg-chalk px-2 text-right font-bold outline-none focus:border-pitch" /> : <b className="tnum">{s.score === null ? "-" : s.score.toLocaleString("id-ID")}</b>}
          </li>
        ))}
      </ul>
      {canScore ? (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" onClick={save} disabled={busy}>{busy ? "Menyimpan…" : "Simpan skor"}</Button>
          <span className="tnum text-xs text-ink-soft">Jumlah {sum.toLocaleString("id-ID")}</span>
        </div>
      ) : null}
      {msg ? <p className={`mt-2 text-sm font-semibold ${msg.tone === "error" ? "text-[#b42318]" : "text-turf"}`}>{msg.text}</p> : null}
    </div>
  );
}
