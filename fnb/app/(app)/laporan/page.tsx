import { dailyReport, REPORT_DATE, todayJakarta } from "@/server/reports";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const num = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
const METHOD: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ tanggal?: string }> }) {
  const ctx = await requireFnbPage();
  if (!can(ctx, "reports.read")) {
    return <main className="mx-auto max-w-3xl p-4 sm:p-8"><h1 className="text-3xl font-extrabold">Laporan</h1>
      <p className="mt-4 rounded-2xl bg-stone-100 p-4 text-stone-600">Laporan hanya untuk pemilik, manajer, dan akuntan.</p></main>;
  }
  const { tanggal } = await searchParams;
  const date = tanggal && REPORT_DATE.test(tanggal) ? tanggal : todayJakarta();
  const r = await dailyReport(ctx, date);
  const margin = r.sales - r.foodCost;
  const profit = margin - r.expenses;
  const label = new Date(`${date}T12:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-extrabold">Laporan harian</h1><p className="mt-1 text-stone-600">{label}</p></div>
      <form className="flex items-center gap-2">
        <label htmlFor="tanggal" className="text-sm font-bold text-stone-600">Tanggal</label>
        <input id="tanggal" name="tanggal" type="date" defaultValue={date} max={todayJakarta()} className="h-11 rounded-xl border border-stone-300 bg-white px-3" />
        <button className="h-11 rounded-full bg-kitchen px-5 text-sm font-bold text-white">Lihat</button>
      </form>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <a href={`/api/v1/reports/export?dari=${date}&sampai=${date}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700">Unduh CSV tanggal ini</a>
      <a href={`/api/v1/reports/export?dari=${date.slice(0, 8)}01&sampai=${date}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-700">Unduh CSV sejak awal bulan</a>
    </div>

    <section className="mt-6 rounded-[2rem] bg-kitchen p-6 text-white">
      <p className="text-sm font-bold text-saffron">Penjualan</p>
      <p className="mt-1 text-4xl font-extrabold tabular-nums">{rupiah(r.sales)}</p>
      <p className="mt-1 text-sm text-white/70">{r.paymentCount} pembayaran · {r.orders.total} pesanan{r.orders.cancelled ? ` · ${r.orders.cancelled} dibatalkan` : ""}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-white/70">Biaya bahan (food cost)</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(r.foodCost)}</dd></div>
        <div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-white/70">Selisih penjualan dan bahan</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(margin)}</dd></div>
        <div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-white/70">Pengeluaran</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(r.expenses)}</dd></div>
        <div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-white/70">Laba setelah pengeluaran</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(profit)}</dd></div>
        <div className="rounded-2xl bg-white/10 p-3"><dt className="text-xs text-white/70">Pembayaran dibatalkan</dt><dd className="mt-1 font-extrabold tabular-nums">{r.orders.voidedPayments ? `${r.orders.voidedPayments} · ${rupiah(r.orders.voidedAmount)}` : "Tidak ada"}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-white/60">Penjualan = uang pembayaran yang diterima hari ini dikurangi refund, sudah termasuk pajak dan service charge.</p>
    </section>

    <section className="mt-4 rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Rincian tagihan</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs text-stone-600">Diskon diberikan</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(r.charges.discount)}</dd></div>
        <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs text-stone-600">Service charge</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(r.charges.service)}</dd></div>
        <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs text-stone-600">Pajak</dt><dd className="mt-1 font-extrabold tabular-nums">{rupiah(r.charges.tax)}</dd></div>
        <div className="rounded-2xl bg-stone-50 p-3"><dt className="text-xs text-stone-600">Refund</dt><dd className="mt-1 font-extrabold tabular-nums">{r.refunds.count ? `${rupiah(r.refunds.amount)} (${r.refunds.count}x)` : "Tidak ada"}</dd></div>
      </dl>
    </section>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <section className="rounded-[2rem] bg-white p-6">
        <h2 className="text-xl font-extrabold">Metode bayar</h2>
        <div className="mt-3 divide-y divide-stone-200">
          {r.byMethod.map((m) => <div key={m.method} className="flex justify-between py-2"><span>{METHOD[m.method] ?? m.method}</span><b className="tabular-nums">{rupiah(m.amount)}</b></div>)}
          {!r.byMethod.length ? <p className="py-6 text-center text-stone-600">Belum ada pembayaran di tanggal ini.</p> : null}
        </div>
      </section>
      <section className="rounded-[2rem] bg-white p-6">
        <h2 className="text-xl font-extrabold">Menu terlaris</h2>
        <div className="mt-3 divide-y divide-stone-200">
          {r.topItems.map((i, idx) => <div key={i.name} className="flex items-baseline gap-3 py-2">
            <span className="w-5 text-stone-600 tabular-nums">{idx + 1}.</span><span className="min-w-0 flex-1">{i.name}</span>
            <span className="text-sm text-stone-600 tabular-nums">{i.quantity} porsi</span><b className="tabular-nums">{rupiah(i.revenue)}</b>
          </div>)}
          {!r.topItems.length ? <p className="py-6 text-center text-stone-600">Belum ada pesanan di tanggal ini.</p> : null}
        </div>
      </section>
    </div>

    {r.lowStock.length ? <section className="mt-4 rounded-[2rem] bg-saffron/20 p-6">
      <h2 className="text-xl font-extrabold">Perlu belanja</h2>
      <p className="mt-1 text-sm text-stone-700">Bahan di bawah atau sama dengan batas minimum.</p>
      <ul className="mt-3 grid gap-1">
        {r.lowStock.map((i) => <li key={i.name} className="flex justify-between"><b>{i.name}</b><span className="tabular-nums">{num(i.stock)} / min {num(i.minimum)} {i.unit}</span></li>)}
      </ul>
    </section> : null}
  </main>;
}
