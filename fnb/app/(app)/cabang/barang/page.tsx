import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { branchOverview } from "@/server/branches";
import { can } from "@/server/context";
import { listOutletItems } from "@/server/outlet-items";
import { requireFnbPage } from "@/server/routing";
import { OutletItemsManager } from "./outlet-items-manager";

export default async function OutletItemsPage({ searchParams }: { searchParams: Promise<{ cabang?: string }> }) {
  const ctx = await requireFnbPage();
  if (!can(ctx, "branches.manage")) redirect("/");
  const { branches } = await branchOverview(ctx);
  const { cabang } = await searchParams;
  const current = branches.find((b) => b.id === cabang) ?? branches[0]!;
  const items = await listOutletItems(ctx, current.id);
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Bisnis" title="Barang per cabang">Atur harga jual, HPP, ketersediaan, batas stok minimum, dan stok tiap menu untuk satu cabang. Kosongkan harga atau HPP supaya mengikuti harga dasar menu.</PageHead>
    <OutletItemsManager key={current.id} branches={branches.map((b) => ({ id: b.id, name: b.name }))} current={current.id} items={items} />
  </main>;
}
