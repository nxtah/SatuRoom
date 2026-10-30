import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import { listPrinters } from "@/server/printers";
import { requireFnbPage } from "@/server/routing";
import { PrinterManager } from "./printer-manager";

export default async function PrinterPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <PageHead kicker="Bisnis" title="Manajemen printer">Daftar printer yang dipakai usaha Anda dan fungsinya (struk, dapur, bar). Struk memakai lebar kertas printer struk bawaan.</PageHead>
    <PrinterManager initial={await listPrinters(ctx)} />
  </main>;
}
