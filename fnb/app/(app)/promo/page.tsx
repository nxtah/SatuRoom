import { redirect } from "next/navigation";
import { can } from "@/server/context";
import { listVouchers } from "@/server/promos";
import { requireFnbPage } from "@/server/routing";
import { VoucherPanel } from "./voucher-panel";

export default async function PromoPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "promos.manage")) redirect("/");
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Penjualan</p>
    <h1 className="text-3xl font-extrabold">Voucher</h1>
    <p className="mt-1 text-stone-600">Kasir memasukkan kode di POS. Aturan dicek server, kuota berkurang saat pesanan dibuat dan kembali bila pesanan dibatalkan.</p>
    <VoucherPanel initial={await listVouchers(ctx)} />
  </main>;
}
