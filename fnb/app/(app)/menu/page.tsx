import { listCatalog } from "@/server/catalog";
import { requireFnbPage } from "@/server/routing";
import { CatalogManager } from "./catalog-manager";
export default async function MenuPage(){const ctx=await requireFnbPage();return <main className="mx-auto max-w-6xl p-4 sm:p-8"><p className="font-bold text-tomato">Katalog</p><h1 className="text-3xl font-extrabold">Menu dan dapur</h1><p className="mt-2 text-stone-600">Kategori, harga, station dapur, dan status jual terhubung ke POS.</p><CatalogManager initial={await listCatalog(ctx)}/></main>}
