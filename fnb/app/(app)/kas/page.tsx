import Link from "next/link";
import { currentShiftSummary, listRecentPayments } from "@/server/payments";
import { requireFnbPage } from "@/server/routing";
import { CashPanel } from "./cash-panel";

export default async function CashPage() {
  const ctx = await requireFnbPage();
  const [summary, payments] = await Promise.all([currentShiftSummary(ctx), listRecentPayments(ctx)]);
  const canCash = ctx.roles.some((r) => ["owner", "manager", "cashier", "accounting"].includes(r));
  const canVoid = ctx.roles.some((r) => ["owner", "manager", "accounting"].includes(r));
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="font-bold text-tomato">Kas</p><h1 className="text-3xl font-extrabold">Shift & pembayaran</h1></div>
      <Link href="/pesanan" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-600">Lihat pesanan</Link>
    </div>
    <p className="mt-1 text-stone-600">Kas awal, penjualan shift ini, dan selisih laci dihitung otomatis.</p>
    <CashPanel initial={summary} payments={payments} canCash={canCash} canVoid={canVoid} />
  </main>;
}
