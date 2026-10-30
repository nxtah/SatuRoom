import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReceiptView } from "@/components/receipt-view";
import { AppError } from "@/server/errors";
import { getReceipt, type Receipt } from "@/server/receipt";
import { requireFnbPage } from "@/server/routing";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Struk" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFnbPage();
  const { id } = await params;
  let receipt: Receipt;
  try {
    receipt = await getReceipt(ctx, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    redirect("/");
  }
  return <main className="min-h-dvh bg-plate p-4 print:bg-white print:p-0">
    <style>{`@media print { @page { size: ${receipt.paper}mm auto; margin: 0 } }`}</style>
    <ReceiptView receipt={receipt} />
    <div className="mx-auto mt-4 flex max-w-[24rem] flex-col items-center gap-2 print:hidden">
      <PrintButton />
      <p className="text-xs text-stone-500">Kertas {receipt.paper} mm{receipt.printerName ? ` · printer ${receipt.printerName}` : ""}. Pilih printer di dialog cetak browser.</p>
    </div>
  </main>;
}
