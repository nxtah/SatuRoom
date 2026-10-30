import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { branchOverview } from "@/server/branches";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { BranchManager } from "./branch-manager";

export default async function BranchPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "branches.manage")) redirect("/");
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <PageHead kicker="Bisnis" title="Cabang">Cabang pertama gratis. Cabang tambahan berbayar per cabang: ajukan di sini, admin SatuRoom menghubungi Anda, dan setelah jatah dinaikkan Anda bisa menambah cabangnya sendiri.</PageHead>
    <BranchManager data={await branchOverview(ctx)} />
  </main>;
}
