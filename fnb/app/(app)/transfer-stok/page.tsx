import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { branchOverview } from "@/server/branches";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { listTransfers } from "@/server/transfers";
import { TransferManager } from "./transfer-manager";

export default async function TransferPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "branches.manage") && !can(ctx, "stock.manage")) redirect("/");
  const [{ branches }, transfers] = await Promise.all([branchOverview(ctx), listTransfers(ctx)]);
  const { listCatalog } = await import("@/server/catalog");
  const catalog = await listCatalog(ctx);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <PageHead kicker="Inventaris" title="Transfer stok">Pindahkan barang jadi antar cabang. Saat dikirim, stok cabang asal langsung berkurang; stok cabang tujuan bertambah setelah barang diterima.</PageHead>
    <TransferManager branches={branches.map((b) => ({ id: b.id, name: b.name }))} items={catalog.items.filter((i) => i.trackStock).map((i) => ({ id: i.id, name: i.name }))} transfers={transfers} />
  </main>;
}
