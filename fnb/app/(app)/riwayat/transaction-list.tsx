"use client";
import { Printer } from "lucide-react";
import { useState } from "react";
import { Modal, rupiah } from "@/components/ui";
import type { TxDetail, TxRow } from "@/server/transactions";

const STATE: Record<string, [string, string]> = { lunas: ["Lunas", "bg-basil/10 text-basil"], sebagian: ["Sebagian", "bg-saffron/30 text-kitchen"], belum: ["Belum bayar", "bg-stone-100 text-stone-600"], refund: ["Direfund", "bg-tomato/15 text-chili"], batal: ["Dibatalkan", "bg-stone-200 text-stone-600"] };
const METHOD: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function TransactionList({ rows }: { rows: TxRow[] }) {
  const [open, setOpen] = useState<TxRow | null>(null);
  const [detail, setDetail] = useState<TxDetail | null>(null);
  const [error, setError] = useState("");

  async function show(r: TxRow) {
    setOpen(r); setDetail(null); setError("");
    const res = await fetch(`/api/v1/transactions/${r.id}`).catch(() => null);
    if (res?.ok) setDetail(await res.json());
    else setError("Detail belum dapat dimuat.");
  }
  return <>
    <ul className="mt-3 grid gap-2">
      {rows.map((r) => <li key={r.id}>
        <button onClick={() => show(r)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-[1.4rem] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5">
          <b className="min-w-32">{r.receiptNo}</b>
          <span className="text-sm text-stone-600">{when(r.at)}</span>
          <span className="text-sm text-stone-600">{r.typeName}{r.tableName ? ` · ${r.tableName}` : ""}</span>
          {r.customerName ? <span className="text-sm text-stone-600">{r.customerName}</span> : null}
          <span className="ml-auto flex items-center gap-3">
            {r.methods.length ? <span className="hidden text-xs text-stone-500 sm:inline">{r.methods.map((m) => METHOD[m] ?? m).join(", ")}</span> : null}
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATE[r.state]?.[1]}`}>{STATE[r.state]?.[0] ?? r.state}</span>
            <b className="w-28 text-right tabular-nums">{rupiah(r.total)}</b>
          </span>
        </button>
      </li>)}
      {!rows.length ? <li className="rounded-[2rem] bg-white p-10 text-center text-stone-500">Tidak ada transaksi yang cocok.</li> : null}
    </ul>
    <Modal wide open={!!open} onClose={() => setOpen(null)} title={open ? `Transaksi ${open.receiptNo}` : ""}>
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : !detail ? <p className="py-10 text-center text-stone-500">Memuat...</p> : <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATE[detail.state]?.[1]}`}>{STATE[detail.state]?.[0]}</span>
          <span>{when(detail.at)} · {detail.typeName}{detail.tableName ? ` · ${detail.tableName}` : ""}</span>
          {detail.cashier ? <span>Kasir {detail.cashier}</span> : null}
          {detail.customerName ? <span>Pelanggan {detail.customerName}</span> : null}
          <a href={`/struk/${detail.id}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-kitchen px-4 font-bold text-white"><Printer aria-hidden className="size-4" />Buka struk</a>
        </div>
        <section><h3 className="font-extrabold">Isi pesanan</h3>
          <ul className="mt-2 divide-y divide-stone-200 rounded-2xl bg-white px-4">{detail.lines.map((l, i) => <li key={i} className="flex gap-3 py-2 text-sm"><span className="w-8 font-bold">{l.qty}x</span><span className="flex-1">{l.name}{l.modifiers.length ? <span className="block text-xs text-stone-500">{l.modifiers.join(", ")}</span> : null}{l.notes ? <span className="block text-xs text-stone-500">Catatan: {l.notes}</span> : null}</span><b className="tabular-nums">{rupiah(l.unitPrice * l.qty)}</b></li>)}</ul>
          <dl className="mt-2 grid gap-1 px-1 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(detail.subtotal)}</dd></div>
            {detail.discount ? <div className="flex justify-between"><dt>Diskon{detail.discountReason ? ` (${detail.discountReason})` : ""}</dt><dd>-{rupiah(detail.discount)}</dd></div> : null}
            {detail.service ? <div className="flex justify-between"><dt>Service charge</dt><dd>{rupiah(detail.service)}</dd></div> : null}
            {detail.tax ? <div className="flex justify-between"><dt>Pajak</dt><dd>{rupiah(detail.tax)}</dd></div> : null}
            <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{rupiah(detail.total)}</dd></div></dl>
        </section>
        {detail.payments.length ? <section><h3 className="font-extrabold">Pembayaran</h3>
          <ul className="mt-2 grid gap-1.5">{detail.payments.map((p) => <li key={p.id} className={`flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm ${p.voided ? "text-stone-400 line-through" : ""}`}><b>{METHOD[p.method] ?? p.method}</b><span>{rupiah(p.amount)}</span>{p.tendered ? <span className="text-stone-500">diterima {rupiah(p.tendered)}</span> : null}<span className="ml-auto text-xs">{when(p.at)}{p.by ? ` · ${p.by}` : ""}</span>{p.voided ? <span className="basis-full text-xs">Dibatalkan: {p.voidReason}</span> : null}</li>)}</ul>
        </section> : null}
        {detail.refunds.length ? <section><h3 className="font-extrabold">Refund</h3><ul className="mt-2 grid gap-1.5">{detail.refunds.map((r, i) => <li key={i} className="rounded-2xl bg-tomato/10 px-4 py-2 text-sm"><b>{rupiah(r.amount)}</b> via {METHOD[r.method] ?? r.method} · {r.reason}<span className="block text-xs text-stone-500">{when(r.at)}{r.by ? ` · ${r.by}` : ""}</span></li>)}</ul></section> : null}
        <section><h3 className="font-extrabold">Alur</h3><ol className="mt-2 grid gap-1 border-l-2 border-stone-300 pl-4 text-sm">{detail.timeline.map((t, i) => <li key={i}><span className="text-xs text-stone-500">{when(t.at)}</span><br />{t.label}</li>)}</ol></section>
      </div>}
    </Modal>
  </>;
}
