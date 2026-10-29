"use client";
import { useState } from "react";
import type { CashMovement, PaymentRow, ShiftSummary } from "@/server/payments";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const METHOD: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };

export function CashPanel({ initial, payments, movements, canCash, canVoid, canRefund }: {
  initial: ShiftSummary; payments: PaymentRow[]; movements: CashMovement[]; canCash: boolean; canVoid: boolean; canRefund: boolean;
}) {
  const [moves, setMoves] = useState(movements);
  const [move, setMove] = useState({ kind: "out", amount: "", category: "", reason: "" });
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [refund, setRefund] = useState({ amount: "", reason: "" });
  const [summary, setSummary] = useState(initial);
  const [rows, setRows] = useState(payments);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [voidFor, setVoidFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function refresh() {
    const [res, mv] = await Promise.all([fetch("/api/v1/shifts"), fetch("/api/v1/cash-movements")]);
    if (res.ok) setSummary(await res.json());
    if (mv.ok) setMoves(await mv.json());
  }

  async function addMove() {
    setBusy(true); setError(""); setMessage("");
    const res = await fetch("/api/v1/cash-movements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...move, amount: Number(move.amount || 0) }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setMove({ kind: move.kind, amount: "", category: "", reason: "" }); setMessage("Kas tercatat."); await refresh(); }
    else setError(data.error ?? "Kas belum dapat dicatat.");
    setBusy(false);
  }

  async function doRefund(id: string) {
    setBusy(true); setError(""); setMessage("");
    const res = await fetch(`/api/v1/payments/${id}/refund`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: Number(refund.amount || 0), reason: refund.reason }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, refunded: x.refunded + Number(refund.amount || 0) } : x)));
      setRefundFor(null); setRefund({ amount: "", reason: "" }); setMessage("Refund tercatat."); await refresh();
    } else setError(data.error ?? "Refund belum dapat dicatat.");
    setBusy(false);
  }

  async function open() {
    setBusy(true); setError(""); setMessage("");
    const res = await fetch("/api/v1/shifts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ openingCash: Number(openingCash || 0) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setOpeningCash(""); setMessage("Kas dibuka. Selamat bekerja."); await refresh(); }
    else setError(data.error ?? "Kas belum dapat dibuka.");
    setBusy(false);
  }

  async function close() {
    setBusy(true); setError(""); setMessage("");
    const res = await fetch("/api/v1/shifts/close", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ closingCash: Number(closingCash || 0), notes: notes || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setClosingCash(""); setNotes("");
      const v = Number(data.variance ?? 0);
      setMessage(`Kas ditutup. Seharusnya ${rupiah(data.expectedCash ?? 0)}. ${v === 0 ? "Pas, tidak ada selisih." : v > 0 ? `Lebih ${rupiah(v)}.` : `Kurang ${rupiah(-v)}.`}`);
      await refresh();
    } else setError(data.error ?? "Kas belum dapat ditutup.");
    setBusy(false);
  }

  async function voidPayment(id: string) {
    setError(""); setMessage("");
    const res = await fetch(`/api/v1/payments/${id}/void`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, voidedAt: new Date().toISOString(), voidReason: reason } : x)));
      setVoidFor(null); setReason(""); setMessage("Pembayaran dibatalkan.");
      await refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Pembayaran belum dapat dibatalkan.");
    }
  }

  const diff = summary.shift ? Number(closingCash || 0) - summary.expectedCash : 0;

  return <div className="mt-6 grid gap-4">
    {!summary.shift ? <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Buka kas</h2>
      <p className="mt-1 text-sm text-stone-500">Masukkan uang awal di laci sebelum mulai melayani.</p>
      {canCash ? <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} type="number" min="0" placeholder="Kas awal, mis. 200000" className="h-12 min-w-0 flex-1 rounded-xl border border-stone-200 px-3" />
        <button onClick={open} disabled={busy} className="h-12 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Buka kas</button>
      </div> : <p className="mt-4 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">Hanya kasir, manajer, atau pemilik yang bisa membuka kas.</p>}
    </section> : <>
      <section className="rounded-[2rem] bg-kitchen p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-bold text-saffron">Shift berjalan</p><p className="text-sm text-white/60">Dibuka {new Date(summary.shift.openedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p></div>
          <b className="rounded-full bg-white/10 px-3 py-1 text-sm">{summary.orderCount} pesanan dibayar</b>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Kas awal" value={rupiah(summary.shift.openingCash)} />
          <Stat label="Penjualan" value={rupiah(summary.salesTotal)} />
          <Stat label="Tunai" value={rupiah(summary.cashTotal)} />
          <Stat label="Non-tunai" value={rupiah(summary.nonCashTotal)} />
          <Stat label="Kas masuk" value={rupiah(summary.cashIn)} />
          <Stat label="Kas keluar" value={rupiah(summary.cashOut)} />
          <Stat label="Refund tunai" value={rupiah(summary.cashRefunds)} />
        </dl>
        <p className="mt-4 rounded-2xl bg-white/10 p-4 text-sm">Seharusnya di laci: <b className="text-saffron">{rupiah(summary.expectedCash)}</b><span className="block text-xs text-white/60">Kas awal + tunai + kas masuk - kas keluar - refund tunai. QRIS dan transfer tidak masuk laci.</span></p>
      </section>
      {canCash ? <section className="rounded-[2rem] bg-white p-6">
        <h2 className="text-xl font-extrabold">Kas masuk dan keluar</h2>
        <p className="mt-1 text-sm text-stone-500">Catat uang laci di luar penjualan, misalnya beli es batu atau tambah uang receh.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[8rem_1fr_1fr]">
          <select aria-label="Jenis" value={move.kind} onChange={(e) => setMove({ ...move, kind: e.target.value })} className="h-11 rounded-xl border border-stone-200 bg-white px-3"><option value="out">Kas keluar</option><option value="in">Kas masuk</option></select>
          <input aria-label="Nominal" value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} type="number" min="1" placeholder="Nominal" className="h-11 min-w-0 rounded-xl border border-stone-200 px-3" />
          <input aria-label="Kategori" value={move.category} onChange={(e) => setMove({ ...move, category: e.target.value })} placeholder="Kategori, mis. Operasional" className="h-11 min-w-0 rounded-xl border border-stone-200 px-3" />
          <input aria-label="Alasan" value={move.reason} onChange={(e) => setMove({ ...move, reason: e.target.value })} placeholder="Alasan" className="h-11 min-w-0 rounded-xl border border-stone-200 px-3 sm:col-span-2" />
          <button onClick={addMove} disabled={busy || !move.amount || move.category.trim().length < 2 || move.reason.trim().length < 3} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Catat</button>
        </div>
        {moves.length ? <ul className="mt-4 grid gap-2">{moves.map((m) => <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-stone-50 p-3 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.kind === "in" ? "bg-basil/10 text-basil" : "bg-red-50 text-red-700"}`}>{m.kind === "in" ? "Masuk" : "Keluar"}</span>
          <span className="min-w-0 flex-1 truncate"><b>{m.category}</b> · {m.reason}</span>
          <b>{m.kind === "in" ? "+" : "-"}{rupiah(m.amount)}</b>
        </li>)}</ul> : null}
      </section> : null}
      {canCash ? <section className="rounded-[2rem] bg-white p-6">
        <h2 className="text-xl font-extrabold">Tutup kas</h2>
        <p className="mt-1 text-sm text-stone-500">Hitung uang fisik di laci, lalu isi di bawah.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={closingCash} onChange={(e) => setClosingCash(e.target.value)} type="number" min="0" placeholder="Uang di laci" className="h-12 rounded-xl border border-stone-200 px-3" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (opsional)" className="h-12 rounded-xl border border-stone-200 px-3" />
          <button onClick={close} disabled={busy} className="h-12 rounded-full bg-basil px-6 font-extrabold text-white disabled:opacity-40">Tutup kas</button>
        </div>
        {closingCash ? <p className={`mt-3 text-sm font-bold ${diff === 0 ? "text-basil" : "text-tomato"}`}>
          {diff === 0 ? "Pas, tidak ada selisih." : diff > 0 ? `Lebih ${rupiah(diff)} dari catatan.` : `Kurang ${rupiah(-diff)} dari catatan.`}
        </p> : null}
      </section> : null}
    </>}

    {message ? <p className="rounded-2xl bg-basil/10 p-4 text-sm font-bold text-basil">{message}</p> : null}
    {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}

    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="font-extrabold">Pembayaran terakhir</h2>
      <div className="mt-3 grid gap-2">
        {rows.map((p) => <div key={p.id} className="rounded-2xl border border-stone-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className={p.voidedAt ? "text-stone-400 line-through" : ""}>#{p.orderNumber}</b>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">{METHOD[p.method] ?? p.method}</span>
            <span className="text-xs text-stone-500">{new Date(p.recordedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
            <b className={`ml-auto ${p.voidedAt ? "text-stone-400 line-through" : ""}`}>{rupiah(p.amount)}</b>
            {!p.voidedAt && canRefund && p.amount - p.refunded > 0 ? <button onClick={() => { setRefundFor(p.id); setRefund({ amount: String(p.amount - p.refunded), reason: "" }); }} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">Refund</button> : null}
            {!p.voidedAt && canVoid && p.refunded === 0 ? <button onClick={() => { setVoidFor(p.id); setReason(""); }} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Batalkan</button> : null}
            {p.voidedAt ? <span className="text-xs font-bold text-red-700">dibatalkan</span> : null}
          </div>
          {p.refunded > 0 ? <p className="mt-1 text-xs font-bold text-tomato">Sudah di-refund {rupiah(p.refunded)}</p> : null}
          {refundFor === p.id ? <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <input aria-label="Nominal refund" type="number" min="1" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} className="h-10 min-w-0 rounded-xl border border-stone-200 px-3 text-sm" />
            <input aria-label="Alasan refund" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} placeholder="Alasan refund" className="h-10 min-w-0 rounded-xl border border-stone-200 px-3 text-sm" />
            <div className="flex gap-2"><button disabled={busy || refund.reason.trim().length < 3} onClick={() => doRefund(p.id)} className="h-10 rounded-full bg-tomato px-4 text-sm font-bold text-white disabled:opacity-40">Simpan</button><button onClick={() => setRefundFor(null)} className="h-10 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-600">Batal</button></div>
          </div> : null}
          {p.voidedAt && p.voidReason ? <p className="mt-1 text-xs text-stone-500">Alasan: {p.voidReason}</p> : null}
          {voidFor === p.id ? <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pembatalan" className="h-10 min-w-0 flex-1 rounded-xl border border-stone-200 px-3 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => voidPayment(p.id)} className="h-10 rounded-full bg-tomato px-4 text-sm font-bold text-white">Simpan</button>
              <button onClick={() => setVoidFor(null)} className="h-10 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-600">Batal</button>
            </div>
          </div> : null}
        </div>)}
        {!rows.length ? <p className="py-10 text-center text-stone-500">Belum ada pembayaran.</p> : null}
      </div>
    </section>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-white/60">{label}</dt><dd className="mt-1 font-extrabold">{value}</dd></div>;
}
