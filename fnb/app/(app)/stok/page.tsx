import { listStock } from "@/server/stock";
import { requireFnbPage } from "@/server/routing";
import { StockPanel } from "./stock-panel";

export default async function StockPage() {
  const ctx = await requireFnbPage();
  const data = await listStock(ctx);
  const canManage = ctx.roles.some((r) => ["owner", "manager", "inventory"].includes(r));
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <h1 className="text-3xl font-extrabold">Bahan & resep</h1>
    <p className="mt-1 text-stone-600">Setiap pesanan memotong bahan sesuai resep menu. Bahan hampir habis ditandai otomatis.</p>
    <StockPanel initial={data} canManage={canManage} />
  </main>;
}
