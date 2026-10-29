"use client";

import { Armchair, CalendarClock, Crown, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MemberPicker, type PickedMember } from "@/components/member-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { computeBill, TIER_LABEL } from "@/lib/billing";
import { clock, duration } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import type { FloorTable } from "@/server/tables";

interface Board {
  tables: FloorTable[];
  serverNow: string;
}

const STATUS = {
  free: { label: "Kosong", dot: "bg-turf" },
  playing: { label: "Main", dot: "bg-ember" },
  reserved: { label: "Dipesan", dot: "bg-sun" },
  maintenance: { label: "Perawatan", dot: "bg-ink-soft" },
} as const;

/**
 * Papan lantai langsung. Data disegarkan tiap 15 detik; jam berjalan dihitung di browser dari selisih
 * jam server supaya tidak melenceng bila jam perangkat salah.
 */
export function FloorBoard({ initial, timezone, canRun }: { initial: Board; timezone: string; canRun: boolean }) {
  const router = useRouter();
  const [board, setBoard] = useState(initial);
  const [offset, setOffset] = useState(() => new Date(initial.serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => new Date(initial.serverNow).getTime());
  const [opening, setOpening] = useState<FloorTable | null>(null);

  const refresh = useCallback(async () => {
    const r = await api<Board>("/floor");
    if (r.ok) {
      setBoard(r.data);
      setOffset(new Date(r.data.serverNow).getTime() - Date.now());
    }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now() + offset), 1000);
    const poll = setInterval(refresh, 15_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [offset, refresh]);

  const playing = board.tables.filter((t) => t.status === "playing").length;
  const free = board.tables.filter((t) => t.status === "free").length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="tile inline-flex items-center gap-2 px-3 py-1.5"><i className="size-2.5 rounded-sm bg-ember" /> {playing} main</span>
        <span className="tile inline-flex items-center gap-2 px-3 py-1.5"><i className="size-2.5 rounded-sm bg-turf" /> {free} kosong</span>
        <span className="ml-auto text-xs font-semibold text-ink-soft">Otomatis diperbarui</span>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {board.tables.map((t) => (
          <li key={t.id}>
            <TableCard table={t} now={now} timezone={timezone} canRun={canRun} onOpen={() => setOpening(t)} />
          </li>
        ))}
      </ul>

      {opening ? (
        <OpenDialog
          table={opening}
          onClose={() => setOpening(null)}
          onDone={(id) => {
            router.push(`/meja/${id}`);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function TableCard({ table: t, now, timezone, canRun, onOpen }: { table: FloorTable; now: number; timezone: string; canRun: boolean; onOpen: () => void }) {
  const s = STATUS[t.status];
  const base = "tile tile-press relative block h-full w-full overflow-hidden p-5 text-left";
  const dark = t.status === "playing" && t.session !== null;
  const head = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {t.kind === "vip" ? <Crown aria-hidden className="size-4 text-sun" /> : null}
          {t.name}
        </p>
        <p className={`text-sm ${dark ? "text-white/70" : "text-ink-soft"}`}>{t.seats} kursi · {rupiah(t.ratePerHour)}/jam</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold ${dark ? "bg-white/15 text-white" : "bg-mist"}`}>
        <i className={`size-2 rounded-sm ${s.dot} ${t.status === "playing" ? "pulse-dot" : ""}`} /> {s.label}
      </span>
    </div>
  );

  if (t.status === "playing" && t.session) {
    const started = new Date(t.session.startedAt).getTime();
    const bill = computeBill({
      rate: t.session.rate, step: t.session.step, minMinutes: t.session.minMinutes,
      startedAt: t.session.startedAt, endedAt: new Date(now).toISOString(), fnb: t.session.fnb, discountPct: t.session.discountPct,
    });
    const sec = Math.max(0, Math.floor((now - started) / 1000));
    const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return (
      <Link href={`/meja/${t.session.id}`} className={`${base} bg-pitch text-white`} style={{ background: "var(--color-pitch)", color: "#fff", borderColor: "transparent", boxShadow: "0 4px 0 var(--color-night)" }}>
        {head}
        <p className="tnum mt-4 text-4xl font-extrabold tracking-tight">{hh}:{mm}<span className="text-white/50">:{ss}</span></p>
        <p className="mt-1 truncate font-semibold text-white/80">
          {t.session.label} · {t.session.players} orang{t.session.memberTier && t.session.memberTier !== "regular" ? ` · ${TIER_LABEL[t.session.memberTier]}` : ""}
        </p>
        <p className="tnum mt-4 flex items-baseline justify-between border-t border-white/15 pt-3">
          <span className="text-xs font-bold tracking-wide text-white/60 uppercase">Tagihan sementara</span>
          <span className="text-lg font-extrabold">{rupiah(bill.total)}</span>
        </p>
      </Link>
    );
  }

  const body = (
    <>
      {head}
      {t.status === "maintenance" ? (
        <p className="mt-5 flex items-center gap-2 text-ink-soft"><Wrench aria-hidden className="size-4" /> Tidak bisa dipakai.</p>
      ) : (
        <>
          {t.nextBooking ? (
            <p className="mt-5 flex items-center gap-2 rounded-lg bg-[#faf1d9] px-3 py-2 text-sm font-semibold text-[#6b5314]">
              <CalendarClock aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{clock(t.nextBooking.startsAt, timezone)} · {t.nextBooking.name} ({t.nextBooking.pax})</span>
            </p>
          ) : (
            <p className="mt-5 flex items-center gap-2 text-ink-soft"><Armchair aria-hidden className="size-4" /> Siap dipakai.</p>
          )}
          {canRun ? <p className="mt-4 text-sm font-extrabold text-ember">Buka meja</p> : null}
        </>
      )}
    </>
  );
  if (t.status === "maintenance" || !canRun) return <div className={`${base} tile-press-off`}>{body}</div>;
  return (
    <button type="button" onClick={onOpen} className={base}>
      {body}
    </button>
  );
}

function OpenDialog({ table, onClose, onDone }: { table: FloorTable; onClose: () => void; onDone: (sessionId: string) => void }) {
  const [member, setMember] = useState<PickedMember | null>(null);
  const [guest, setGuest] = useState("");
  const [players, setPlayers] = useState(Math.min(4, table.seats));
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    const r = await api<{ id: string }>("/sessions", {
      body: { tableId: table.id, memberId: member?.id ?? null, guestName: member ? null : guest, players, bookingId: table.nextBooking && table.status === "reserved" ? table.nextBooking.id : null },
    });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    onDone(r.data.id);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Buka ${table.name}`} className="fixed inset-0 z-50 grid place-items-end bg-night/60 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="tile rise max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-b-[1.1rem]">
        <div className="flex items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Buka {table.name}</h2>
            <p className="text-sm text-ink-soft">Jam mulai dicatat sekarang. {table.status === "reserved" && table.nextBooking ? `Booking ${table.nextBooking.name} ikut ditandai datang.` : ""}</p>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="grid size-10 place-items-center rounded-lg hover:bg-mist"><X aria-hidden className="size-5" /></button>
        </div>
        <div className="mt-5 grid gap-5">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <MemberPicker value={member} onChange={setMember} />
          {!member ? (
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Nama tamu (boleh kosong)</span>
              <input value={guest} onChange={(e) => setGuest(e.target.value)} maxLength={80} placeholder="Contoh: Rombongan Koh Ahong" className="h-12 w-full rounded-xl border-2 border-line bg-chalk px-4 outline-none focus:border-pitch" />
            </label>
          ) : null}
          <div>
            <p className="mb-2 text-sm font-bold">Jumlah pemain</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: table.seats - 1 }, (_, i) => i + 2).map((n) => (
                <button key={n} type="button" onClick={() => setPlayers(n)} aria-pressed={players === n} className={`size-12 rounded-xl border-2 text-lg font-extrabold ${players === n ? "border-pitch bg-pitch text-white" : "border-line bg-chalk"}`}>{n}</button>
              ))}
            </div>
          </div>
          <Button size="lg" block onClick={submit} disabled={busy}>{busy ? "Membuka…" : "Mulai main"}</Button>
          <p className="text-center text-xs text-ink-soft">Tarif {rupiah(table.ratePerHour)}/jam. Lama main dibulatkan ke atas sesuai aturan tempat ({duration(60)} minimum bila diatur).</p>
        </div>
      </div>
    </div>
  );
}
