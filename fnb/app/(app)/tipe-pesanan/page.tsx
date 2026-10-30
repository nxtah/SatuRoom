import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import { listOrderTypes } from "@/server/order-types";
import { requireFnbPage } from "@/server/routing";
import { getSettings } from "@/server/settings";
import { OrderTypeManager } from "./order-type-manager";

export default async function OrderTypePage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  const [types, settings] = await Promise.all([listOrderTypes(ctx), getSettings(ctx)]);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <PageHead kicker="Penjualan" title="Tipe pesanan">Makan di tempat, bungkus, ojek online, atau tipe lain. Tiap tipe bisa punya service charge dan pajak sendiri, dan bisa mewajibkan pilih meja.</PageHead>
    <OrderTypeManager initial={types} baseService={settings.servicePercent} baseTax={settings.taxPercent} />
  </main>;
}
