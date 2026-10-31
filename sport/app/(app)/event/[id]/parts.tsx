"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { EventRow, Fixture, Participant, Standing } from "@/server/events";
import { cell, EventForm } from "../parts";

function useCall() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function call(path: string, body?: unknown, method?: string, ask?: string): Promise<boolean> {
    if (ask && !confirm(ask)) return false;
    setBusy(true);
    const r = await api(path, { method, body });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
      return false;
    }
    setError(undefined);
    router.refresh();
    return true;
  }
  return { call, error, busy };
}

export function EventActions({ event, today }: { event: EventRow; today: string }) {
  const { call, error, busy } = useCall();
  const [edit, setEdit] = useState(false);
  const status = (s: EventRow["status"], ask?: string) => call(`/events/${event.id}`, { status: s }, undefined, ask);
  if (edit) return <EventForm today={today} event={event} onDone={() => setEdit(false)} />;
  return (
    <div className="rise grid gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {event.status === "draft" ? <Button disabled={busy} onClick={() => status("open", "Buka pendaftaran? Semua orang tua mendapat notifikasi.")}>Buka pendaftaran</Button> : null}
        {event.status === "open" ? <Button variant="outline" disabled={busy} onClick={() => status("closed")}>Tutup pendaftaran</Button> : null}
        {event.status === "closed" ? <Button variant="outline" disabled={busy} onClick={() => status("open")}>Buka lagi</Button> : null}
        {event.status === "open" || event.status === "closed" ? <Button variant="dark" disabled={busy} onClick={() => status("done")}>Tandai selesai</Button> : null}
        {event.status !== "done" && event.status !== "cancelled" ? (
          <>
            <Button variant="ghost" onClick={() => setEdit(true)}>Ubah</Button>
            <Button variant="ghost" disabled={busy} onClick={() => status("cancelled", "Batalkan event ini? Peserta mendapat notifikasi.")}>Batalkan event</Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

const P_STATUS = { registered: "Terdaftar", paid: "Lunas", cancelled: "Batal" } as const;

export function Participants({
  event,
  participants,
  manage,
  canPay,
  today,
  players,
}: {
  event: EventRow;
  participants: Participant[];
  manage: boolean;
  canPay: boolean;
  today: string;
  players: { id: string; name: string }[];
}) {
  const { call, error, busy } = useCall();
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const open = event.status === "open" || event.status === "draft" || event.status === "closed";
  const shown = players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 50);

  return (
    <section className="rise grid gap-4 rounded-[2rem] bg-chalk p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold">Peserta ({participants.filter((p) => p.status !== "cancelled").length}{event.capacity ? `/${event.capacity}` : ""})</h2>
        {event.fee ? <span className="text-sm font-bold">Terkumpul {rupiah(participants.filter((p) => p.status === "paid").reduce((s, p) => s + p.fee, 0))}</span> : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {participants.length === 0 ? <EmptyState title="Belum ada peserta">Daftarkan pemain di bawah, atau buka pendaftaran untuk orang tua.</EmptyState> : null}
      <ul className="grid gap-2">
        {participants.map((p) => (
          <li key={p.id} className={`rounded-2xl bg-mist p-3 ${p.status === "cancelled" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              {p.rank ? <span className="grid size-8 place-items-center rounded-full bg-ember font-extrabold">{p.rank}</span> : null}
              <Link href={`/pemain/${p.playerId}`} className="min-w-0 flex-1 font-bold break-words hover:underline">{p.fullName}</Link>
              {p.channel === "parent" ? <span className="text-xs text-ink-soft">daftar sendiri</span> : null}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.status === "paid" ? "bg-turf-soft text-pitch" : p.status === "cancelled" ? "bg-white" : "bg-sun/40"}`}>
                {p.fee || p.status === "cancelled" ? P_STATUS[p.status] : "Terdaftar"}
              </span>
            </div>
            {p.result ? <p className="mt-1 text-sm">{p.result}</p> : null}
            {manage && p.status !== "cancelled" ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.status === "registered" && p.fee && canPay ? (
                  <>
                    <Button size="sm" variant="dark" disabled={busy} onClick={() => call(`/participants/${p.id}`, { action: "pay", method: "cash", paidOn: today })}>Bayar tunai</Button>
                    <Button size="sm" variant="dark" disabled={busy} onClick={() => call(`/participants/${p.id}`, { action: "pay", method: "transfer", paidOn: today })}>Transfer</Button>
                  </>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setResult(result === p.id ? null : p.id)}>Hasil</Button>
                {(p.status === "registered" || canPay) ? (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => call(`/participants/${p.id}`, { action: "cancel" }, undefined, p.status === "paid" ? "Batalkan peserta? Pembayarannya dicatat dikembalikan." : "Batalkan peserta ini?")}>
                    Batalkan
                  </Button>
                ) : null}
              </div>
            ) : null}
            {result === p.id ? (
              <form
                className="mt-2 grid grid-cols-[5rem_minmax(0,1fr)_auto] gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (await call(`/participants/${p.id}`, { action: "result", rank: f.get("rank"), result: f.get("result") })) setResult(null);
                }}
              >
                <input name="rank" inputMode="numeric" placeholder="Peringkat" aria-label="Peringkat" defaultValue={p.rank ?? ""} className={cell} />
                <input name="result" placeholder="Juara 1 / Pemain terbaik" aria-label="Hasil" defaultValue={p.result ?? ""} className={cell} />
                <Button size="sm" type="submit" disabled={busy}>Simpan</Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {manage && open && players.length ? (
        <div className="grid gap-2 rounded-2xl border-2 border-dashed border-line p-4">
          <p className="font-bold">Daftarkan pemain</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama" aria-label="Cari pemain" className={cell} />
          <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 hover:bg-mist">
                  <input
                    type="checkbox"
                    checked={pick.has(p.id)}
                    onChange={(e) => setPick((s) => { const n = new Set(s); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })}
                    className="size-5 accent-pitch"
                  />
                  <span className="min-w-0 truncate">{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            className="justify-self-start"
            disabled={busy || pick.size === 0}
            onClick={async () => {
              if (await call(`/events/${event.id}/participants`, { playerIds: [...pick] })) setPick(new Set());
            }}
          >
            Daftarkan {pick.size || ""} pemain
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function Tournament({
  eventId,
  manage,
  teams,
  fixtures,
  standings,
  ownTeams,
  today,
}: {
  eventId: string;
  manage: boolean;
  teams: { id: string; name: string; group: string | null }[];
  fixtures: Fixture[];
  standings: Standing[];
  ownTeams: { id: string; name: string }[];
  today: string;
}) {
  const { call, error, busy } = useCall();
  const groups = [...new Set(standings.map((s) => s.group ?? ""))];

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <section className="rise grid gap-3 rounded-[2rem] bg-chalk p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Klasemen</h2>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {standings.length === 0 ? <p className="text-sm text-ink-soft">Tambahkan tim peserta turnamen.</p> : null}
        {groups.map((g) => (
          <div key={g} className="overflow-x-auto">
            {g ? <p className="mb-1 text-sm font-extrabold text-ink-soft">Grup {g}</p> : null}
            <table className="w-full min-w-[22rem] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr><th className="py-1">#</th><th>Tim</th><th className="text-center">M</th><th className="text-center">M-S-K</th><th className="text-center">SG</th><th className="text-right">Poin</th>{manage ? <th /> : null}</tr>
              </thead>
              <tbody>
                {standings.filter((s) => (s.group ?? "") === g).map((s, i) => (
                  <tr key={s.teamId} className="border-t border-mist">
                    <td className="py-2 font-bold">{i + 1}</td>
                    <td className="font-bold">{s.name}</td>
                    <td className="text-center tabular-nums">{s.played}</td>
                    <td className="text-center tabular-nums">{s.won}-{s.drawn}-{s.lost}</td>
                    <td className="text-center tabular-nums">{s.goalsFor - s.goalsAgainst > 0 ? "+" : ""}{s.goalsFor - s.goalsAgainst}</td>
                    <td className="text-right font-extrabold tabular-nums">{s.points}</td>
                    {manage ? (
                      <td className="text-right">
                        {s.played === 0 ? (
                          <button type="button" aria-label={`Hapus ${s.name}`} onClick={() => call(`/event-teams/${s.teamId}`, undefined, "DELETE", `Hapus ${s.name}?`)} className="p-1 text-ink-soft hover:text-flame">
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {manage ? (
          <form
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_auto]"
            onSubmit={async (e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const f = new FormData(el);
              const own = ownTeams.find((t) => t.id === f.get("teamId"));
              if (await call(`/events/${eventId}/teams`, { name: f.get("name") || own?.name, group: f.get("group"), teamId: f.get("teamId") })) el.reset();
            }}
          >
            <select name="teamId" aria-label="Tim akademi" className={`${cell} sm:col-span-3`} defaultValue="">
              <option value="">Tim tamu (isi nama)</option>
              {ownTeams.map((t) => <option key={t.id} value={t.id}>Tim kita: {t.name}</option>)}
            </select>
            <input name="name" placeholder="Nama tim" aria-label="Nama tim" className={cell} />
            <input name="group" placeholder="Grup" aria-label="Grup" maxLength={20} className={cell} />
            <Button type="submit" size="sm" disabled={busy}>Tambah tim</Button>
          </form>
        ) : null}
      </section>
      <section className="rise grid gap-3 rounded-[2rem] bg-chalk p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Pertandingan</h2>
        {fixtures.length === 0 ? <p className="text-sm text-ink-soft">Belum ada jadwal pertandingan.</p> : null}
        <ul className="grid gap-2">
          {fixtures.map((f) => (
            <li key={f.id} className="rounded-2xl bg-mist p-3">
              <p className="text-xs text-ink-soft">{f.round ? `Babak ${f.round}` : ""}{f.playedOn ? ` · ${f.playedOn}` : ""}</p>
              {manage ? (
                <form
                  className="mt-1 grid grid-cols-[minmax(0,1fr)_3.5rem_auto_3.5rem_minmax(0,1fr)_auto] items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    call(`/fixtures/${f.id}`, { home: d.get("home"), away: d.get("away") }, "PUT");
                  }}
                >
                  <span className="min-w-0 truncate text-right font-bold">{f.home}</span>
                  <input name="home" inputMode="numeric" aria-label={`Skor ${f.home}`} defaultValue={f.homeScore ?? ""} className="h-10 w-full rounded-xl border-2 border-line bg-white text-center font-extrabold" />
                  <span>-</span>
                  <input name="away" inputMode="numeric" aria-label={`Skor ${f.away}`} defaultValue={f.awayScore ?? ""} className="h-10 w-full rounded-xl border-2 border-line bg-white text-center font-extrabold" />
                  <span className="min-w-0 truncate font-bold">{f.away}</span>
                  <span className="flex">
                    <Button size="sm" type="submit" variant="ghost" disabled={busy}>Simpan</Button>
                    <button type="button" aria-label="Hapus pertandingan" onClick={() => call(`/fixtures/${f.id}`, undefined, "DELETE", "Hapus pertandingan ini?")} className="p-1 text-ink-soft hover:text-flame">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </span>
                </form>
              ) : (
                <p className="mt-1 flex justify-between gap-2 font-bold">
                  <span className="min-w-0 truncate">{f.home}</span>
                  <span className="tabular-nums">{f.homeScore ?? "-"} : {f.awayScore ?? "-"}</span>
                  <span className="min-w-0 truncate text-right">{f.away}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
        {manage && teams.length >= 2 ? (
          <form
            className="grid grid-cols-2 gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const d = new FormData(el);
              if (await call(`/events/${eventId}/fixtures`, { homeId: d.get("homeId"), awayId: d.get("awayId"), round: d.get("round"), playedOn: d.get("playedOn") })) el.reset();
            }}
          >
            <select name="homeId" aria-label="Tim kandang" className={cell} defaultValue="">
              <option value="" disabled>Tim A</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="awayId" aria-label="Tim tandang" className={cell} defaultValue="">
              <option value="" disabled>Tim B</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input name="round" placeholder="Babak (mis. 1, Semifinal)" aria-label="Babak" className={cell} />
            <input type="date" name="playedOn" defaultValue={today} aria-label="Tanggal" className={cell} />
            <Button type="submit" size="sm" className="justify-self-start" disabled={busy}>Tambah pertandingan</Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
