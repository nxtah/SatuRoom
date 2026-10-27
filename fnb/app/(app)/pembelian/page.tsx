import { listPurchases, listSuppliers } from "@/server/purchases";
import { requireFnbPage } from "@/server/routing";
import { listStock } from "@/server/stock";
import { PurchasePanel } from "./purchase-panel";

export default async function PurchasePage() {
  const ctx = await requireFnbPage();
  const [suppliers, purchases, stock] = await Promise.all([listSuppliers(ctx), listPurchases(ctx), listStock(ctx)]);
  const canManage = ctx.roles.some((r) => ["owner", "manager", "inventory"].includes(r));
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <h1 className="text-3xl font-extrabold">Pembelian bahan</h1>
    <p className="mt-1 text-stone-600">Catat belanja dari supplier. Stok bertambah dan harga rata-rata bahan dihitung otomatis.</p>
    <PurchasePanel suppliers={suppliers} purchases={purchases} ingredients={stock.ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))} canManage={canManage} />
  </main>;
}
