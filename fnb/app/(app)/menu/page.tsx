import { can } from "@/server/context";
import { listCatalog } from "@/server/catalog";
import { requireFnbPage } from "@/server/routing";
import { CatalogManager } from "./catalog-manager";
import { GroupManager, ItemEditor } from "./menu-tools";

export default async function MenuPage() {
  const ctx = await requireFnbPage();
  const catalog = await listCatalog(ctx);
  const canManage = can(ctx, "catalog.manage");
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Katalog</p>
    <h1 className="text-3xl font-extrabold">Menu dan dapur</h1>
    <p className="mt-2 text-stone-600">Kategori, harga, station dapur, varian, dan status jual terhubung ke POS.</p>
    <CatalogManager initial={catalog} />
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <ItemEditor catalog={catalog} canManage={canManage} />
      <GroupManager groups={catalog.groups} canManage={canManage} />
    </div>
  </main>;
}
