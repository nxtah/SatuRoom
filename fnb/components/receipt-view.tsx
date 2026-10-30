import { thumb } from "@/lib/images";
import type { Receipt } from "@/server/receipt";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const METHOD: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };
const TYPE: Record<string, string> = { dine_in: "Dine in", takeaway: "Bungkus", pickup: "Ambil" };

/** Tampilan struk yang dipakai halaman cetak dan pratinjau templat, supaya yang dilihat pemilik sama dengan yang tercetak. */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const t = receipt.template;
  const paid = receipt.payments.reduce((s, p) => s + p.amount, 0);
  const change = receipt.payments.reduce((s, p) => s + (p.tendered === null ? 0 : p.tendered - p.amount), 0);
  const width = receipt.paper === 58 ? "max-w-[17rem] print:max-w-[58mm]" : "max-w-[24rem] print:max-w-[80mm]";
  return <div className={`mx-auto ${width} rounded-[1.5rem] bg-white p-6 font-mono text-sm shadow-sm print:rounded-none print:p-2 print:shadow-none`}>
    <div className="text-center">
      {t.logoUrl ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(t.logoUrl, 240) ?? undefined} alt="" className="mx-auto mb-2 max-h-16 w-auto object-contain" />
      </> : null}
      <p className="text-base font-extrabold">{receipt.businessName}</p>
      {receipt.header ? <p className="mt-1 text-xs text-stone-600">{receipt.header}</p> : null}
    </div>
    <hr className="my-3 border-dashed border-stone-300" />
    <dl className="grid gap-0.5 text-xs">
      <div className="flex justify-between"><dt>No.</dt><dd className="font-bold">{receipt.receiptNo}</dd></div>
      <div className="flex justify-between"><dt>Tanggal</dt><dd>{new Date(receipt.openedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</dd></div>
      <div className="flex justify-between"><dt>Jenis</dt><dd>{receipt.typeName ?? TYPE[receipt.type] ?? receipt.type}{t.showTable && receipt.tableName ? ` · ${receipt.tableName}` : ""}</dd></div>
      {t.showCustomer && receipt.customerName ? <div className="flex justify-between"><dt>Pelanggan</dt><dd>{receipt.customerName}</dd></div> : null}
      {t.showCashier && receipt.cashier ? <div className="flex justify-between"><dt>Kasir</dt><dd>{receipt.cashier}</dd></div> : null}
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
      {t.showTaxDetail && receipt.service > 0 ? <div className="flex justify-between"><dt>Service {receipt.servicePercent}%</dt><dd>{rupiah(receipt.service)}</dd></div> : null}
      {t.showTaxDetail && receipt.tax > 0 ? <div className="flex justify-between"><dt>Pajak {receipt.taxPercent}%</dt><dd>{rupiah(receipt.tax)}</dd></div> : null}
      {!t.showTaxDetail && receipt.service + receipt.tax > 0 ? <div className="flex justify-between"><dt>Pajak dan layanan</dt><dd>{rupiah(receipt.service + receipt.tax)}</dd></div> : null}
      <div className="mt-1 flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{rupiah(receipt.total)}</dd></div>
    </dl>
    {t.showPayment ? receipt.payments.length ? <>
      <hr className="my-3 border-dashed border-stone-300" />
      <dl className="grid gap-0.5">
        {receipt.payments.map((p, n) => <div key={n} className="flex justify-between"><dt>{METHOD[p.method] ?? p.method}</dt><dd>{rupiah(p.amount)}</dd></div>)}
        {receipt.payments.map((p, n) => p.tendered !== null ? <div key={`t${n}`} className="flex justify-between text-xs text-stone-600"><dt>Uang diterima</dt><dd>{rupiah(p.tendered)}</dd></div> : null)}
        {change > 0 ? <div className="flex justify-between"><dt>Kembalian</dt><dd>{rupiah(change)}</dd></div> : null}
        {paid < receipt.total ? <div className="flex justify-between font-bold"><dt>Sisa</dt><dd>{rupiah(receipt.total - paid)}</dd></div> : null}
      </dl>
    </> : <p className="mt-3 text-center text-xs font-bold text-stone-600">Belum dibayar</p> : null}
    {receipt.refunds.length ? <ul className="mt-3 text-xs text-stone-600">{receipt.refunds.map((r, n) => <li key={n} className="flex justify-between"><span>Refund {METHOD[r.method] ?? r.method}: {r.reason}</span><span>-{rupiah(r.amount)}</span></li>)}</ul> : null}
    {receipt.status === "cancelled" ? <p className="mt-3 text-center font-extrabold">DIBATALKAN</p> : null}
    {receipt.footer ? <><hr className="my-3 border-dashed border-stone-300" /><p className="text-center text-xs text-stone-600">{receipt.footer}</p></> : null}
  </div>;
}
