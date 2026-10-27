import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AreaTrend, BarList, Sparkline } from "@/components/charts";
import { Maskot } from "@/components/maskot";
import { formatBusinessCode } from "@/lib/business-code";
import { getFnbBusinessCode } from "@/server/business";
import { listOrders } from "@/server/orders";
import { dailyReport, salesSeries, todayJakarta } from "@/server/reports";
import { requireFnbPage } from "@/server/routing";
import { listStock } from "@/server/stock";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const compact = (n: number) => (n >= 1_000_000 ? `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} jt` : n >= 1000 ? `Rp${Math.round(n / 1000)} rb` : `Rp${n}`);
const niceMax = (n: number) => {
  if (n <= 0) return 100_000;
  const step = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / step) * step;
};
const weekday = (iso: string) => new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" });

export default async function FnbDashboard() {
  const ctx = await requireFnbPage();
  const canReport = ctx.roles.some((r) => ["owner", "manager", "accounting"].includes(r));
  const canCash = ctx.roles.some((r) => ["owner", "manager", "cashier", "accounting"].includes(r));
  const today = todayJakarta();
  const [code, orders, stock, report, series] = await Promise.all([
    getFnbBusinessCode(ctx),
    listOrders(ctx, "active"),
    listStock(ctx),
    canReport ? dailyReport(ctx, today) : null,
    canReport ? salesSeries(ctx, today) : null,
  ]);
  const low = stock.ingredients.filter((i) => i.low);
  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
  const waiting = orders.filter((o) => o.status === "confirmed").length;
  const weekSales = series ? series.days.reduce((a, d) => a + d.sales, 0) : 0;
  const peak = series ? Math.max(0, ...series.hours.map((h) => h.orders)) : 0;
  const hourOf = new Map(series?.hours.map((h) => [h.hour, h.orders]));
  const links: [string, string, boolean][] = [
    ["/pos", "Buka POS", true], ["/pesanan", "Pesanan", true], ["/dapur", "Dapur", true],
    ["/kas", "Kas & shift", canCash], ["/laporan", "Laporan", canReport], ["/stok", "Stok", true],
  ];

  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <section className="rise relative grid items-end overflow-hidden rounded-[2rem] bg-kitchen px-6 pt-8 text-white sm:grid-cols-[minmax(0,1fr)_auto] sm:px-10 sm:pt-10">
      <span aria-hidden className="pointer-events-none absolute right-6 bottom-0 size-52 rounded-full bg-white/[0.06] sm:right-12 sm:size-72" />
      <div className="relative pb-6 sm:pb-12">
        <p className="font-bold text-saffron">{todayLabel}</p>
        <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">Operasional hari ini</h1>
        <p className="mt-2 max-w-md text-white/70">POS, dapur, stok, dan laporan terhubung dalam satu alur.</p>
        <p className="mt-3 text-white/70">ID bisnis <span className="rounded-full bg-white/12 px-2.5 py-0.5 font-extrabold tracking-wider text-white select-all">{formatBusinessCode(code)}</span></p>
        <nav aria-label="Pintasan" className="mt-6 flex flex-wrap gap-2">
          {links.filter(([, , show]) => show).map(([href, label], i) => (
            <Link key={href} href={href} className={`inline-flex h-11 items-center rounded-full px-5 font-extrabold transition hover:-translate-y-0.5 ${i === 0 ? "bg-saffron text-kitchen hover:bg-white" : "bg-white/12 text-white hover:bg-white/20"}`}>{label}</Link>
          ))}
        </nav>
      </div>
      <div className="relative mx-auto w-40 sm:mx-0 sm:w-64"><Maskot priority className="maskot-float drop-shadow-maskot" /></div>
    </section>

    <section aria-label="Ringkasan" className="rise mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {report && series ? (
        <div className="col-span-2 flex min-h-36 flex-col justify-between rounded-[1.75rem] bg-saffron p-5 text-kitchen">
          <span className="text-sm font-bold text-kitchen/75">Penjualan hari ini</span>
          <span className="flex items-end justify-between gap-3">
            <span>
              <span className="block text-4xl leading-none font-extrabold tracking-tight tabular-nums">{rupiah(report.sales)}</span>
              <span className="mt-2 block text-sm text-kitchen/75">{report.paymentCount} pembayaran</span>
            </span>
            <span className="w-28 shrink-0 text-kitchen sm:w-40"><Sparkline values={series.days.map((d) => d.sales)} /></span>
          </span>
        </div>
      ) : null}
      {[
        ["Pesanan aktif", String(orders.length), "/pesanan"],
        ["Menunggu dapur", String(waiting), "/dapur"],
        ...(report ? [] : [["Stok menipis", String(low.length), "/stok"]]),
      ].map(([label, value, href]) => (
        <Link key={label} href={href} className="flex min-h-36 flex-col justify-between rounded-[1.75rem] bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-26px_rgb(49_37_29/0.5)]">
          <span className="text-sm font-bold text-stone-600">{label}</span>
          <span className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">{value}</span>
        </Link>
      ))}
    </section>

    {low.length ? (
      <Link href="/stok" className="rise group mt-4 flex items-center gap-3 rounded-[1.5rem] bg-saffron/20 p-4 font-bold text-kitchen">
        <AlertTriangle aria-hidden className="size-5 shrink-0" />
        <span className="min-w-0 flex-1">Hampir habis: {low.map((i) => i.name).join(", ")}</span>
        <ArrowRight aria-hidden className="size-5 shrink-0 transition group-hover:translate-x-0.5" />
      </Link>
    ) : null}

    {report && series ? (
      <section className="rise mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]" aria-label="Statistik penjualan">
        <figure className="rounded-[2rem] bg-white p-6">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="text-lg font-extrabold">Penjualan 7 hari</span>
            <span className="text-sm text-stone-500">Total {rupiah(weekSales)}</span>
          </figcaption>
          {weekSales > 0 ? (
            <AreaTrend
              className="mt-8 text-tomato"
              caption="Penjualan 7 hari terakhir"
              max={niceMax(Math.max(...series.days.map((d) => d.sales)))}
              ticks={[0, niceMax(Math.max(...series.days.map((d) => d.sales))) / 2, niceMax(Math.max(...series.days.map((d) => d.sales)))]}
              format={compact}
              points={series.days.map((d) => ({ label: weekday(d.date), value: d.sales, note: rupiah(d.sales) }))}
            />
          ) : (
            <p className="mt-6 rounded-2xl bg-plate p-5 text-stone-600">Belum ada penjualan dalam 7 hari. Setelah pembayaran pertama dicatat di POS, grafiknya muncul di sini.</p>
          )}
        </figure>
        <figure className="rounded-[2rem] bg-white p-6">
          <figcaption><span className="block text-lg font-extrabold">Menu terlaris hari ini</span><span className="block text-sm text-stone-500">Jumlah porsi terjual</span></figcaption>
          {report.topItems.length ? (
            <BarList className="mt-6" barClassName="bg-saffron" rows={report.topItems.map((t) => ({ label: t.name, value: t.quantity, hint: rupiah(t.revenue) }))} format={(n) => `${n} porsi`} />
          ) : (
            <p className="mt-6 rounded-2xl bg-plate p-5 text-stone-600">Belum ada pesanan hari ini.</p>
          )}
        </figure>
        {peak > 0 ? (
          <figure className="rounded-[2rem] bg-white p-6 lg:col-span-2">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4"><span className="text-lg font-extrabold">Jam paling ramai</span><span className="text-sm text-stone-500">Pesanan per jam, 7 hari terakhir</span></figcaption>
            <ol className="mt-6 flex h-32 items-end gap-1 sm:gap-1.5" aria-label="Pesanan per jam">
              {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => {
                const n = hourOf.get(h) ?? 0;
                return (
                  <li key={h} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`Jam ${h}: ${n} pesanan`}>
                    <span className={`grow-col block w-full rounded-t-lg ${n === peak ? "bg-tomato" : "bg-saffron/60"}`} style={{ height: `${Math.max((n / peak) * 100, n ? 6 : 2)}%`, animationDelay: `${(h - 6) * 30}ms` }} />
                    <span className="text-[10px] font-semibold text-stone-500 sm:text-xs">{h}</span>
                  </li>
                );
              })}
            </ol>
          </figure>
        ) : null}
      </section>
    ) : null}
  </main>;
}
