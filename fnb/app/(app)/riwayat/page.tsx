import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import { listCashiers } from "@/server/report-center";
import { todayJakarta } from "@/server/reports";
import { requireFnbPage } from "@/server/routing";
import { listTransactions, parseTxFilter, PAY_STATES } from "@/server/transactions";
import { TransactionList } from "./transaction-list";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireFnbPage();
  if (!can(ctx, "orders.sell") && !can(ctx, "cash.manage") && !can(ctx, "reports.read")) redirect("/");
  const today = todayJakarta();
  const q = await searchParams;
  let f;
  try { f = parseTxFilter(q, today); } catch { f = parseTxFilter({}, today); }
  const [result, cashiers] = await Promise.all([listTransactions(ctx, f), can(ctx, "reports.read") ? listCashiers(ctx) : Promise.resolve([])]);
  const href = (page: number) => {
    const p = new URLSearchParams({ dari: f.from, sampai: f.to, hal: String(page) });
    if (f.state) p.set("bayar", f.state);
    if (f.method) p.set("metode", f.method);
    if (f.cashierId) p.set("kasir", f.cashierId);
    if (f.q) p.set("cari", f.q);
    return `/riwayat?${p}`;
  };
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Penjualan" title="Riwayat transaksi">Semua transaksi, dicari per nomor struk atau pelanggan. Buka satu transaksi untuk melihat isi, pembayaran, refund, dan alurnya.</PageHead>
    <form className="mt-5 grid gap-3 rounded-[1.6rem] bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="grid gap-1 text-sm font-bold lg:col-span-2">Cari<input name="cari" defaultValue={f.q} placeholder="No. struk atau nama pelanggan" className="h-11 rounded-xl border border-stone-300 px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold">Dari<input type="date" name="dari" defaultValue={f.from} max={today} className="h-11 rounded-xl border border-stone-300 px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold">Sampai<input type="date" name="sampai" defaultValue={f.to} max={today} className="h-11 rounded-xl border border-stone-300 px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold">Status bayar<select name="bayar" defaultValue={f.state} className="h-11 rounded-xl border border-stone-300 bg-white px-3 font-normal"><option value="">Semua</option>{PAY_STATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold">Metode<select name="metode" defaultValue={f.method} className="h-11 rounded-xl border border-stone-300 bg-white px-3 font-normal"><option value="">Semua</option><option value="cash">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="card">Kartu</option><option value="other">Lainnya</option></select></label>
      {cashiers.length ? <label className="grid gap-1 text-sm font-bold">Kasir<select name="kasir" defaultValue={f.cashierId ?? ""} className="h-11 rounded-xl border border-stone-300 bg-white px-3 font-normal"><option value="">Semua kasir</option>{cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label> : null}
      <div className="flex items-end gap-2 lg:col-span-2"><button className="h-11 rounded-full bg-kitchen px-6 font-bold text-white">Terapkan</button><Link href="/riwayat" className="inline-flex h-11 items-center rounded-full bg-stone-100 px-5 font-bold">Atur ulang</Link></div>
    </form>
    <p className="mt-4 text-sm text-stone-600">{result.total.toLocaleString("id-ID")} transaksi ditemukan.</p>
    <TransactionList rows={result.rows} />
    {result.pages > 1 ? <nav aria-label="Halaman" className="mt-4 flex items-center justify-center gap-3">
      {f.page > 1 ? <Link href={href(f.page - 1)} className="rounded-full bg-white px-5 py-2 font-bold">Sebelumnya</Link> : null}
      <span className="text-sm text-stone-600">Halaman {f.page} dari {result.pages}</span>
      {f.page < result.pages ? <Link href={href(f.page + 1)} className="rounded-full bg-white px-5 py-2 font-bold">Berikutnya</Link> : null}
    </nav> : null}
  </main>;
}
