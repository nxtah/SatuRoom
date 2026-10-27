import { listOrders } from "@/server/orders";
import { requireFnbPage } from "@/server/routing";
import { KdsBoard } from "./kds-board";

export default async function KitchenPage() {
  const ctx = await requireFnbPage();
  return <main className="min-h-[calc(100dvh-4rem)] md:min-h-dvh bg-kitchen p-4 text-white sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="font-bold text-saffron">Dapur</p><h1 className="text-3xl font-extrabold">Tiket masuk</h1></div>
      <p className="text-sm text-white/60">Diperbarui otomatis tiap 5 detik.</p>
    </div>
    <KdsBoard initialOrders={await listOrders(ctx)} />
  </main>;
}
