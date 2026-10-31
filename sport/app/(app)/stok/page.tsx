import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { rupiah } from "@/lib/money";
import { accountOptions } from "@/server/accounting";
import { inAcademy } from "@/server/context";
import { listAssets, listItems, listPurchases, listSuppliers } from "@/server/inventory";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { AssetsPanel, CountPanel, ItemsPanel, PurchasesPanel } from "./parts";

export const metadata: Metadata = { title: "Stok dan aset" };

const TABS = [
  { key: "barang", label: "Barang" },
  { key: "pembelian", label: "Pembelian dan supplier" },
  { key: "opname", label: "Stok opname" },
  { key: "aset", label: "Aset tetap" },
] as const;

export default async function StokPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("inventory") || !ctx.can("inventory.manage") || ctx.branchIds !== null) redirect("/");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "barang";
  const today = await inAcademy(ctx, academyToday);
  const [items, accounts] = await Promise.all([listItems(ctx), accountOptions(ctx)]);
  const cash = accounts.filter((a) => a.isCash).map((a) => ({ id: a.id, name: a.name }));
  const value = items.reduce((s, i) => s + i.value, 0);
  const low = items.filter((i) => i.low).length;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Stok dan aset" subtitle="Barang, pembelian ke supplier, stok opname, dan aset tetap. Nilainya tercatat otomatis di Keuangan." />
      <div className="rise mb-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-chalk px-3 py-1.5 font-bold">Nilai stok {rupiah(value)}</span>
        {low ? <Link href="/stok" className="rounded-full bg-flame/15 px-3 py-1.5 font-bold text-flame">{low} barang hampir habis</Link> : null}
        {ctx.modules.has("store") && ctx.can("store.manage") ? <Link href="/toko" className="rounded-full bg-turf-soft px-3 py-1.5 font-bold text-pitch">Buka Toko</Link> : null}
      </div>
      <nav aria-label="Bagian stok" className="rise -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={`/stok?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={`flex h-11 shrink-0 items-center rounded-full px-4 font-bold ${tab === t.key ? "bg-pitch text-white" : "bg-chalk hover:bg-mist"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "barang" ? <ItemsPanel items={items} storeOn={ctx.modules.has("store")} /> : null}
      {tab === "pembelian" ? <PurchasesPanel today={today} items={items} suppliers={await listSuppliers(ctx)} purchases={await listPurchases(ctx)} cash={cash} /> : null}
      {tab === "opname" ? <CountPanel items={items} /> : null}
      {tab === "aset" ? <AssetsPanel today={today} data={await listAssets(ctx)} cash={cash} /> : null}
    </div>
  );
}
