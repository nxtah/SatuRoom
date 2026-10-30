import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { listCatalog } from "@/server/catalog";
import { can } from "@/server/context";
import { listDiscounts } from "@/server/discounts";
import { listOrderTypes } from "@/server/order-types";
import { listVouchers } from "@/server/promos";
import { requireFnbPage } from "@/server/routing";
import { DiscountPanel } from "./discount-panel";
import { VoucherPanel } from "./voucher-panel";

export default async function PromoPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "promos.manage")) redirect("/");
  const [discounts, vouchers, catalog, types] = await Promise.all([listDiscounts(ctx), listVouchers(ctx), listCatalog(ctx), listOrderTypes(ctx, { onlyActive: true })]);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <PageHead kicker="Penjualan" title="Diskon dan voucher">Diskon dipilih atau terpasang otomatis di kasir; voucher dimasukkan pelanggan lewat kode. Aturannya dicek server, dan potongan tercatat di pesanan serta laporan.</PageHead>
    <DiscountPanel initial={discounts} categories={catalog.categories} items={catalog.items.map((i) => ({ id: i.id, name: i.name }))} types={types.map((t) => ({ id: t.id, name: t.name }))} />
    <section className="mt-10" aria-labelledby="voucher-judul">
      <h2 id="voucher-judul" className="text-2xl font-extrabold">Voucher</h2>
      <p className="text-sm text-stone-600">Kasir memasukkan kode di POS. Kuota berkurang saat pesanan dibuat dan kembali bila pesanan dibatalkan.</p>
      <VoucherPanel initial={vouchers} />
    </section>
  </main>;
}
