import Link from "next/link";
import { listOrders } from "@/server/orders";
import { requireFnbPage } from "@/server/routing";
import { OrdersList } from "./orders-list";

export default async function OrdersPage() {
  const ctx = await requireFnbPage();
  const canPay = ctx.roles.some((r) => ["owner", "manager", "cashier", "accounting"].includes(r));
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="font-bold text-tomato">Penjualan</p><h1 className="text-3xl font-extrabold">Pesanan</h1></div>
      <Link href="/kas" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-600">Kas & shift</Link>
    </div>
    <p className="mt-1 text-stone-600">Dine in, bungkus, dan ambil dalam satu antrean.</p>
    <OrdersList initialOrders={await listOrders(ctx, "all")} canPay={canPay} />
  </main>;
}
