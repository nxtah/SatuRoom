import Link from "next/link";
import { listOrders } from "@/server/orders";
import { dailyReport, todayJakarta } from "@/server/reports";
import { requireFnbPage } from "@/server/routing";
import { listStock } from "@/server/stock";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default async function FnbDashboard() {
  const ctx = await requireFnbPage();
  const canReport = ctx.roles.some((r) => ["owner", "manager", "accounting"].includes(r));
  const canCash = ctx.roles.some((r) => ["owner", "manager", "cashier", "accounting"].includes(r));
  const [orders, stock, report] = await Promise.all([
    listOrders(ctx, "active"),
    listStock(ctx),
    canReport ? dailyReport(ctx, todayJakarta()) : null,
  ]);
  const low = stock.ingredients.filter((i) => i.low);
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
  const stats: [string, string][] = [
    ...(report ? [["Penjualan hari ini", rupiah(report.sales)] as [string, string]] : []),
    ["Pesanan aktif", String(orders.length)],
    ["Menunggu dapur", String(orders.filter((o) => o.status === "confirmed").length)],
    ["Stok menipis", String(low.length)],
  ];
  const links: [string, string, boolean][] = [
    ["/pos", "Buka POS", true], ["/pesanan", "Pesanan", true], ["/dapur", "Dapur", true],
    ["/kas", "Kas & shift", canCash], ["/laporan", "Laporan", canReport], ["/stok", "Stok", true],
  ];
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <section className="rounded-[2rem] bg-kitchen p-7 text-white sm:p-10">
      <p className="font-bold text-saffron">{today}</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">Operasional hari ini</h1>
      <p className="mt-2 text-white/70">POS, dapur, stok, dan laporan terhubung dalam satu alur.</p>
    </section>
    <section className={`mt-4 grid grid-cols-2 gap-3 ${stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {stats.map(([label, value]) => <article key={label} className="rounded-[1.5rem] bg-white p-5">
        <p className="text-sm font-bold text-stone-600">{label}</p>
        <p className="mt-4 text-2xl font-extrabold tabular-nums">{value}</p>
      </article>)}
    </section>
    {low.length ? <p className="mt-4 rounded-2xl bg-saffron/20 p-4 text-sm font-bold text-kitchen">Hampir habis: {low.map((i) => i.name).join(", ")}. <Link href="/stok" className="underline">Cek stok</Link></p> : null}
    <section className="mt-4 rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Menu cepat</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.filter(([, , show]) => show).map(([href, label], i) => <Link key={href} href={href} className={`inline-flex h-11 items-center rounded-full px-5 font-extrabold ${i === 0 ? "bg-saffron text-kitchen" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{label}</Link>)}
      </div>
    </section>
  </main>;
}
