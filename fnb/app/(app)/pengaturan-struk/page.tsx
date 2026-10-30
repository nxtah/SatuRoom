import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import type { Receipt } from "@/server/receipt";
import { getTemplate } from "@/server/receipt-template";
import { requireFnbPage } from "@/server/routing";
import { getSettings } from "@/server/settings";
import { ReceiptDesigner } from "./receipt-designer";

export default async function ReceiptSettingsPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  const [template, settings] = await Promise.all([getTemplate(ctx), getSettings(ctx)]);
  const sample: Omit<Receipt, "template" | "header" | "footer" | "paper"> = {
    businessName: settings.businessName, printerName: null, receiptNo: `${settings.receiptPrefix}-CONTOH-0001`, type: "dine_in", typeName: "Makan di tempat", tableName: "Meja 3", customerName: "Contoh Pelanggan", cashier: "Nama Kasir",
    openedAt: new Date().toISOString(), status: "completed",
    lines: [{ name: "Nasi goreng", qty: 2, unitPrice: 25000, modifiers: ["Pedas"], notes: null }, { name: "Es teh", qty: 2, unitPrice: 8000, modifiers: [], notes: null }],
    subtotal: 66000, discount: 0, discountReason: null, service: Math.round(66000 * settings.servicePercent / 100), servicePercent: settings.servicePercent, tax: Math.round(66000 * settings.taxPercent / 100), taxPercent: settings.taxPercent,
    total: 66000 + Math.round(66000 * settings.servicePercent / 100) + Math.round(66000 * settings.taxPercent / 100),
    payments: [{ method: "cash", amount: 66000 + Math.round(66000 * settings.servicePercent / 100) + Math.round(66000 * settings.taxPercent / 100), tendered: 100000, at: new Date().toISOString() }], refunds: [],
  };
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Bisnis" title="Struk">Atur tampilan struk: logo, teks atas dan bawah, lebar kertas, dan bagian yang ditampilkan. Pratinjau di kanan sama dengan hasil cetak.</PageHead>
    <ReceiptDesigner initial={template} sample={sample} />
  </main>;
}
