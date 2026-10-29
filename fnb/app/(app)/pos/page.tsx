import { listCatalog } from "@/server/catalog";
import { can } from "@/server/context";
import { listOrders } from "@/server/orders";
import { requireFnbPage } from "@/server/routing";
import { getSettings } from "@/server/settings";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  const ctx = await requireFnbPage();
  const [catalog, orders, settings] = await Promise.all([listCatalog(ctx), listOrders(ctx), getSettings(ctx)]);
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Kasir</p>
    <h1 className="text-3xl font-extrabold">Pesanan baru</h1>
    <p className="mt-1 text-stone-600">Total dihitung dari harga menu, diskon, service charge, dan pajak di Pengaturan.</p>
    <PosClient catalog={catalog} initialOrders={orders} servicePercent={settings.servicePercent} taxPercent={settings.taxPercent} canDiscount={can(ctx, "orders.discount")} />
  </main>;
}
