import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import { payoutOverview } from "@/server/payouts";
import { requireFnbPage } from "@/server/routing";
import { PayoutManager } from "./payout-manager";

export default async function PayoutPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "payouts.manage")) redirect("/");
  const data = await payoutOverview(ctx);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <PageHead kicker="Keuangan" title="Payout">Saldo dari pembayaran non-tunai (QRIS, transfer, kartu) yang belum Anda tarik. Rasa mencatat dan menghitung saldo; transfer uangnya Anda lakukan sendiri dari rekening usaha, lalu catat di sini.</PageHead>
    <PayoutManager data={data} />
  </main>;
}
