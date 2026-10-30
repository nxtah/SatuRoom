import { PageHead } from "@/components/ui";
import { listCatalog } from "@/server/catalog";
import { imagesReady } from "@/server/cloudinary";
import { requireFnbPage } from "@/server/routing";
import { MenuManager } from "./menu-manager";

export default async function MenuPage() {
  const ctx = await requireFnbPage();
  const catalog = await listCatalog(ctx);
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Produk" title="Menu">Harga jual, harga pokok, kode barang, stok, pajak, dan gambar. Semua terhubung ke kasir, dapur, stok, dan laporan laba.</PageHead>
    <MenuManager initial={catalog} imagesReady={imagesReady()} />
  </main>;
}
