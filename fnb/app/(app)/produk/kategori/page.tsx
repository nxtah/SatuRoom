import { PageHead } from "@/components/ui";
import { imagesReady } from "@/server/cloudinary";
import { listCatalog } from "@/server/catalog";
import { requireFnbPage } from "@/server/routing";
import { CategoryManager } from "./category-manager";

export default async function CategoryPage() {
  const ctx = await requireFnbPage();
  const catalog = await listCatalog(ctx);
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Produk" title="Kategori">Kelompokkan menu supaya kasir cepat menemukannya. Kategori yang dinonaktifkan hilang dari kasir, menunya tetap tersimpan.</PageHead>
    <CategoryManager initial={catalog.categories} imagesReady={imagesReady()} />
  </main>;
}
