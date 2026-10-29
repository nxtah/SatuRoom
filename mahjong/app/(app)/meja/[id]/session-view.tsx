"use client";

import { Ban, Check, Minus, Plus, Receipt, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MemberPicker, type PickedMember } from "@/components/member-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { computeBill, METHOD_LABEL, TIER_LABEL, type Method } from "@/lib/billing";
import { clock, duration } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import type { MenuRow } from "@/server/menu";
import type { SessionDetail } from "@/server/sessions";

interface Props {
  initial: SessionDetail;
  menu: MenuRow[];
  freeTables: { id: string; name: string; rate: number }[];
  can: { order: boolean; run: boolean; manage: boolean };
}

const row = "flex items-center justify-between gap-3 py-2.5";

export function SessionView({ initial, menu, freeTables, can }: Props) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [offset] = useState(() => new Date(initial.serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => new Date(initial.serverNow).getTime());
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const open = s.status === "open";

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [open, offset]);

  const reload = useCallback(async () => {
    const r = await api<SessionDetail>(`/sessions/${s.id}`);
    if (r.ok) setS(r.data);
    router.refresh();
  }, [s.id, router]);

  async function act(fn: () => ReturnType<typeof api>) {
    setBusy(true);
    setError(undefined);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message);
      return false;
    }
    await reload();
    return true;
  }

  const live = open
    ? computeBill({ rate: s.rate, step: s.step, minMinutes: s.minMinutes, startedAt: s.startedAt, endedAt: new Date(now).toISOString(), fnb: s.bill.fnb, discountPct: s.discountPct })
    : s.bill;
  const orders = s.orders.filter((o) => o.status !== "void");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <section className="felt rise rounded-2xl p-6 text-white shadow-[0_4px_0_var(--color-night)]">
          <p className="text-sm font-bold text-white/70">{s.memberName ?? s.guestName ?? "Tamu"}{s.memberTier ? ` · ${TIER_LABEL[s.memberTier]}` : ""} · {s.players} orang</p>
          <p className="tnum mt-1 text-5xl font-extrabold tracking-tight sm:text-6xl">{duration(Math.floor(live.elapsedMin))}</p>
          <p className="mt-2 text-white/70">Mulai {clock(s.startedAt, s.timezone)}{s.endedAt ? `, selesai ${clock(s.endedAt, s.timezone)}` : ""}. Dihitung {duration(live.billableMin)} (per {s.step} menit, minimal {duration(s.minMinutes)}).</p>
        </section>

        {open && can.order ? (
          <section className="tile rise p-5">
            <h2 className="text-lg font-extrabold">Pesan makanan dan minuman</h2>
            {menu.length ? (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {menu.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={busy || (m.stock !== null && m.stock < 1)}
                      onClick={() => act(() => api(`/sessions/${s.id}/orders`, { body: { menuItemId: m.id, qty: 1 } }))}
                      className="tile-press flex h-full w-full flex-col rounded-xl border border-line bg-mist p-3 text-left shadow-[0_3px_0_var(--color-edge)] disabled:opacity-40"
                    >
                      <span className="font-bold">{m.name}</span>
                      <span className="tnum text-sm text-ink-soft">{rupiah(m.price)}{m.stock !== null ? ` · sisa ${m.stock}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-ink-soft">Menu masih kosong. Tambahkan di halaman Menu.</p>
            )}
          </section>
        ) : null}

        {open && can.run ? (
          <section className="tile rise grid gap-4 p-5">
            <h2 className="text-lg font-extrabold">Ubah meja ini</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold">Pemain</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" aria-label="Kurangi pemain" disabled={busy || s.players <= 1} onClick={() => act(() => api(`/sessions/${s.id}`, { method: "PATCH", body: { players: s.players - 1 } }))}><Minus aria-hidden className="size-4" /></Button>
                  <span className="tnum w-8 text-center text-xl font-extrabold">{s.players}</span>
                  <Button variant="outline" size="sm" aria-label="Tambah pemain" disabled={busy || s.players >= 8} onClick={() => act(() => api(`/sessions/${s.id}`, { method: "PATCH", body: { players: s.players + 1 } }))}><Plus aria-hidden className="size-4" /></Button>
                </div>
              </div>
              {freeTables.length ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Shuffle aria-hidden className="size-4" /> Pindah ke meja kosong</p>
                  <select aria-label="Pindah meja" defaultValue="" disabled={busy} onChange={(e) => e.target.value && act(() => api(`/sessions/${s.id}`, { method: "PATCH", body: { moveToTableId: e.target.value } })).then(() => router.replace(`/meja/${s.id}`))} className="h-12 w-full rounded-xl border-2 border-line bg-chalk px-3">
                    <option value="">Pilih meja…</option>
                    {freeTables.map((t) => <option key={t.id} value={t.id}>{t.name} · {rupiah(t.rate)}/jam</option>)}
                  </select>
                </div>
              ) : null}
            </div>
            {!s.memberId ? <AttachMember onPick={(m) => act(() => api(`/sessions/${s.id}`, { method: "PATCH", body: { memberId: m.id } }))} /> : null}
          </section>
        ) : null}
      </div>

      <aside className="grid content-start gap-5">
        <section className="tile rise p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Receipt aria-hidden className="size-5 text-ember" /> Tagihan</h2>
          <dl className="tnum mt-3 divide-y divide-line">
            <div className={row}><dt>Sewa meja ({duration(live.billableMin)})</dt><dd className="font-bold">{rupiah(live.timeCharge)}</dd></div>
            {live.discount ? <div className={row}><dt>Diskon {TIER_LABEL[s.memberTier ?? "regular"]} {s.discountPct}%</dt><dd className="font-bold text-turf">-{rupiah(live.discount)}</dd></div> : null}
            {orders.map((o) => (
              <div key={o.id} className={row}>
                <dt className="min-w-0"><span className="block truncate">{o.qty}× {o.name}</span>{o.status === "new" && open && can.order ? <span className="text-xs text-ink-soft">Belum diantar</span> : o.status === "served" ? <span className="text-xs text-turf">Sudah diantar</span> : null}</dt>
                <dd className="flex items-center gap-1 font-bold">
                  {rupiah(o.qty * o.unitPrice)}
                  {open && can.order ? (
                    <>
                      {o.status === "new" ? <button type="button" aria-label={`Tandai ${o.name} diantar`} disabled={busy} onClick={() => act(() => api(`/sessions/${s.id}/orders/${o.id}`, { method: "PATCH", body: { status: "served" } }))} className="grid size-9 place-items-center rounded-lg hover:bg-turf-soft"><Check aria-hidden className="size-4" /></button> : null}
                      <button type="button" aria-label={`Batalkan ${o.name}`} disabled={busy} onClick={() => act(() => api(`/sessions/${s.id}/orders/${o.id}`, { method: "PATCH", body: { status: "void" } }))} className="grid size-9 place-items-center rounded-lg hover:bg-[#fdecec]"><Ban aria-hidden className="size-4" /></button>
                    </>
                  ) : null}
                </dd>
              </div>
            ))}
            <div className={`${row} text-xl`}><dt className="font-extrabold">Total</dt><dd className="font-extrabold">{rupiah(live.total)}</dd></div>
          </dl>
          {open ? <p className="mt-2 text-xs text-ink-soft">Angka bergerak sesuai lama main. Final saat dibayar.</p> : null}
        </section>

        {!open ? (
          <section className="tile rise p-5">
            <h2 className="text-lg font-extrabold">Pembayaran</h2>
            {s.payments.length ? (
              <ul className="tnum mt-2 divide-y divide-line">{s.payments.map((p) => <li key={p.id} className={row}><span>{METHOD_LABEL[p.method]}</span><b>{rupiah(p.amount)}</b></li>)}</ul>
            ) : <p className="mt-2 text-ink-soft">{s.status === "void" ? "Sesi dibatalkan, tidak ada tagihan." : "Tidak ada data pembayaran."}</p>}
          </section>
        ) : can.run ? (
          paying ? (
            <PayPanel session={s} total={live.total} busy={busy} onCancel={() => setPaying(false)} onPay={(payments) => act(() => api(`/sessions/${s.id}/close`, { body: { payments } })).then((ok) => ok && setPaying(false))} />
          ) : (
            <div className="grid gap-3">
              <Button size="lg" block onClick={() => setPaying(true)}>Selesai dan bayar</Button>
              <Button variant="ghost" block disabled={busy} onClick={() => confirm("Batalkan sesi ini? Pesanan dikembalikan dan tidak ada tagihan.") && act(() => api(`/sessions/${s.id}/void`, { method: "POST" })).then((ok) => ok && router.replace("/meja"))}>Batalkan sesi</Button>
            </div>
          )
        ) : null}
      </aside>
    </div>
  );
}

function AttachMember({ onPick }: { onPick: (m: PickedMember) => void }) {
  const [m, setM] = useState<PickedMember | null>(null);
  return (
    <div>
      <p className="mb-2 text-sm font-bold">Kaitkan ke member (diskon dan saldo)</p>
      <MemberPicker value={m} onChange={(v) => { setM(v); if (v) onPick(v); }} />
    </div>
  );
}

function PayPanel({ session, total, busy, onPay, onCancel }: { session: SessionDetail; total: number; busy: boolean; onPay: (p: { method: Method; amount: number }[]) => void; onCancel: () => void }) {
  const [lines, setLines] = useState<{ method: Method; amount: number }[]>([{ method: "cash", amount: total }]);
  const sum = lines.reduce((n, l) => n + (Number.isFinite(l.amount) ? l.amount : 0), 0);
  const left = total - sum;
  const methods = (Object.keys(METHOD_LABEL) as Method[]).filter((m) => m !== "balance" || session.memberId);
  return (
    <section className="tile rise grid gap-4 p-5">
      <h2 className="text-lg font-extrabold">Pembayaran</h2>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <select aria-label="Cara bayar" value={l.method} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, method: e.target.value as Method } : x)))} className="h-12 rounded-xl border-2 border-line bg-chalk px-3">
            {methods.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}{m === "balance" ? ` (${rupiah(session.memberBalance)})` : ""}</option>)}
          </select>
          <input aria-label="Nominal" inputMode="numeric" value={l.amount || ""} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value.replace(/\D/g, "")) } : x)))} className="tnum h-12 rounded-xl border-2 border-line bg-chalk px-3 text-right font-bold" />
        </div>
      ))}
      <div className="flex items-center justify-between">
        {lines.length < 3 ? <button type="button" className="text-sm font-bold text-ember" onClick={() => setLines([...lines, { method: "qris", amount: Math.max(0, left) }])}>+ Bayar terpisah</button> : <span />}
        <p className={`tnum text-sm font-extrabold ${left === 0 ? "text-turf" : "text-ember"}`}>{left === 0 ? "Pas" : left > 0 ? `Kurang ${rupiah(left)}` : `Lebih ${rupiah(-left)}`}</p>
      </div>
      <Button size="lg" block disabled={busy || left !== 0 || total <= 0} onClick={() => onPay(lines.filter((l) => l.amount > 0))}>{busy ? "Menyimpan…" : `Bayar ${rupiah(total)}`}</Button>
      <Button variant="ghost" block onClick={onCancel}>Kembali</Button>
    </section>
  );
}
