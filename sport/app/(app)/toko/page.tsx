import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { rupiah } from "@/lib/money";
import { inAcademy } from "@/server/context";
import { listOrders, storeCatalog } from "@/server/inventory";
import { listPlayers } from "@/server/players";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { NewSale, OrderList } from "./parts";

export const metadata: Metadata = { title: "Toko" };

export default async function TokoPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("store") || !ctx.can("store.manage") || ctx.branchIds !== null) redirect("/");
  const [items, orders, players, today] = await Promise.all([storeCatalog(ctx), listOrders(ctx), listPlayers(ctx, {}), inAcademy(ctx, academyToday)]);
  const pending = orders.filter((o) => o.status === "pending");
  const sold = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled" && o.paidOn?.startsWith(today.slice(0, 7))).reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Toko" subtitle="Jual jersey dan perlengkapan. Orang tua juga bisa memesan dari akun pemain, lalu bayar di akademi." />
      <div className="rise mb-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-chalk px-3 py-1.5 font-bold">Penjualan bulan ini {rupiah(sold)}</span>
        {pending.length ? <span className="rounded-full bg-sun/40 px-3 py-1.5 font-bold">{pending.length} pesanan menunggu bayar</span> : null}
        {ctx.can("inventory.manage") ? <Link href="/stok" className="rounded-full bg-turf-soft px-3 py-1.5 font-bold text-pitch">Atur barang dan harga di Stok</Link> : null}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
        <NewSale items={items} players={players.filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.fullName }))} />
        <OrderList orders={orders} today={today} />
      </div>
    </div>
  );
}
