import { listOrders } from "@/server/orders";
import { requireFnbPage } from "@/server/routing";
import { OrdersList } from "./orders-list";

export default async function OrdersPage() {
  const ctx = await requireFnbPage();
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Penjualan</p>
    <h1 className="text-3xl font-extrabold">Pesanan</h1>
    <p className="mt-1 text-stone-600">Dine in, bungkus, dan ambil dalam satu antrean.</p>
    <OrdersList initialOrders={await listOrders(ctx, "all")} />
  </main>;
}
