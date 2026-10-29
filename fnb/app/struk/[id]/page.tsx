import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireFnbPage } from "@/server/routing";
import { AppError } from "@/server/errors";
import { getReceipt, type Receipt } from "@/server/receipt";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Struk" };

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const METHOD: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };
const TYPE: Record<string, string> = { dine_in: "Dine in", takeaway: "Bungkus", pickup: "Ambil" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFnbPage();
  const { id } = await params;
  let receipt: Receipt;
  try {
    receipt = await getReceipt(ctx, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    redirect("/");
  }
  const paid = receipt.payments.reduce((s, p) => s + p.amount, 0);
  const change = receipt.payments.reduce((s, p) => s + (p.tendered === null ? 0 : p.tendered - p.amount), 0);
  return <main className="min-h-dvh bg-plate p-4 print:bg-white print:p-0">
    <div className="mx-auto max-w-[24rem] rounded-[1.5rem] bg-white p-6 font-mono text-sm shadow-sm print:max-w-[80mm] print:rounded-none print:p-2 print:shadow-none">
      <div className="text-center">
        <p className="text-base font-extrabold">{receipt.businessName}</p>
        {receipt.header ? <p className="mt-1 text-xs text-stone-600">{receipt.header}</p> : null}
      </div>
      <hr className="my-3 border-dashed border-stone-300" />
      <dl className="grid gap-0.5 text-xs">
        <div className="flex justify-between"><dt>No.</dt><dd className="font-bold">{receipt.receiptNo}</dd></div>
        <div className="flex justify-between"><dt>Tanggal</dt><dd>{new Date(receipt.openedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</dd></div>
        <div className="flex justify-between"><dt>Jenis</dt><dd>{TYPE[receipt.type] ?? receipt.type}{receipt.tableName ? ` · ${receipt.tableName}` : ""}</dd></div>
        {receipt.customerName ? <div className="flex justify-between"><dt>Pelanggan</dt><dd>{receipt.customerName}</dd></div> : null}
        {receipt.cashier ? <div className="flex justify-between"><dt>Kasir</dt><dd>{receipt.cashier}</dd></div> : null}
      </dl>
      <hr className="my-3 border-dashed border-stone-300" />
      <ul className="grid gap-2">
        {receipt.lines.map((l, n) => <li key={n}>
          <div className="flex justify-between gap-2"><span>{l.qty}x {l.name}</span><span>{rupiah(l.qty * l.unitPrice)}</span></div>
          {l.modifiers.length ? <p className="text-xs text-stone-600">{l.modifiers.join(", ")}</p> : null}
          {l.notes ? <p className="text-xs text-stone-600">Catatan: {l.notes}</p> : null}
        </li>)}
      </ul>
      <hr className="my-3 border-dashed border-stone-300" />
      <dl className="grid gap-0.5">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(receipt.subtotal)}</dd></div>
        {receipt.discount > 0 ? <div className="flex justify-between"><dt>Diskon{receipt.discountReason ? ` (${receipt.discountReason})` : ""}</dt><dd>-{rupiah(receipt.discount)}</dd></div> : null}
        {receipt.service > 0 ? <div className="flex justify-between"><dt>Service {receipt.servicePercent}%</dt><dd>{rupiah(receipt.service)}</dd></div> : null}
        {receipt.tax > 0 ? <div className="flex justify-between"><dt>Pajak {receipt.taxPercent}%</dt><dd>{rupiah(receipt.tax)}</dd></div> : null}
        <div className="mt-1 flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{rupiah(receipt.total)}</dd></div>
      </dl>
      {receipt.payments.length ? <>
        <hr className="my-3 border-dashed border-stone-300" />
        <dl className="grid gap-0.5">
          {receipt.payments.map((p, n) => <div key={n} className="flex justify-between"><dt>{METHOD[p.method] ?? p.method}</dt><dd>{rupiah(p.amount)}</dd></div>)}
          {receipt.payments.map((p, n) => p.tendered !== null ? <div key={`t${n}`} className="flex justify-between text-xs text-stone-600"><dt>Uang diterima</dt><dd>{rupiah(p.tendered)}</dd></div> : null)}
          {change > 0 ? <div className="flex justify-between"><dt>Kembalian</dt><dd>{rupiah(change)}</dd></div> : null}
          {paid < receipt.total ? <div className="flex justify-between font-bold"><dt>Sisa</dt><dd>{rupiah(receipt.total - paid)}</dd></div> : null}
        </dl>
      </> : <p className="mt-3 text-center text-xs font-bold text-stone-600">Belum dibayar</p>}
      {receipt.refunds.length ? <ul className="mt-3 text-xs text-stone-600">{receipt.refunds.map((r, n) => <li key={n} className="flex justify-between"><span>Refund {METHOD[r.method] ?? r.method}: {r.reason}</span><span>-{rupiah(r.amount)}</span></li>)}</ul> : null}
      {receipt.status === "cancelled" ? <p className="mt-3 text-center font-extrabold">DIBATALKAN</p> : null}
      {receipt.footer ? <><hr className="my-3 border-dashed border-stone-300" /><p className="text-center text-xs text-stone-600">{receipt.footer}</p></> : null}
    </div>
    <div className="mx-auto mt-4 flex max-w-[24rem] justify-center print:hidden"><PrintButton /></div>
  </main>;
}
