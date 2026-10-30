import { PageHead } from "@/components/ui";
import { listCatalog } from "@/server/catalog";
import { imagesReady } from "@/server/cloudinary";
import { requireFnbPage } from "@/server/routing";
import { listStock } from "@/server/stock";
import { AddonManager } from "./addon-manager";

export default async function AddonPage() {
  const ctx = await requireFnbPage();
  const [catalog, stock] = await Promise.all([listCatalog(ctx), listStock(ctx)]);
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Produk" title="Add-on dan varian">Grup pilihan seperti Ukuran, Topping, atau Level Pedas. Tiap opsi bisa punya harga tambahan, HPP, dan memotong bahan di stok.</PageHead>
    <AddonManager groups={catalog.groups} items={catalog.items.map((i) => ({ id: i.id, name: i.name }))} ingredients={stock.ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))} imagesReady={imagesReady()} />
  </main>;
}
