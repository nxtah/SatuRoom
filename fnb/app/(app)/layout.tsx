import { AppShell } from "@/components/app-shell";
import type { Permission } from "@/lib/permissions";
import { can } from "@/server/context";
import { REPORTS } from "@/server/report-center";
import { requireFnbPage } from "@/server/routing";

/** Menu yang tampil mengikuti izin. Server tetap memeriksa izin di setiap aksi. */
const NEEDS: Record<string, Permission[]> = {
  "/pos": ["orders.sell"],
  "/pesanan": ["orders.sell", "cash.manage", "kitchen.run"],
  "/dapur": ["kitchen.run"],
  "/kas": ["cash.manage"],
  "/riwayat": ["orders.sell", "cash.manage", "reports.read"],
  "/payout": ["payouts.manage"],
  "/cabang": ["branches.manage"],
  "/cabang/barang": ["branches.manage"],
  "/transfer-stok": ["branches.manage", "stock.manage"],
  "/stok": ["stock.manage"],
  "/pembelian": ["purchases.manage"],
  "/produk/kategori": ["catalog.manage"],
  "/produk/menu": ["catalog.manage"],
  "/produk/addon": ["catalog.manage"],
  "/pelanggan": ["orders.sell"],
  "/promo": ["promos.manage"],
  "/tipe-pesanan": ["settings.manage"],
  "/pengaturan-struk": ["settings.manage"],
  "/printer": ["settings.manage"],
  "/grup-meja": ["settings.manage"],
  "/pengeluaran": ["expenses.manage"],
  "/laporan": ["reports.read"],
  "/staf": ["staff.manage"],
  "/peran": ["roles.manage"],
  "/audit": ["audit.read"],
  ...Object.fromEntries(REPORTS.map((r) => [`/laporan/${r.slug}`, ["reports.read"] as Permission[]])),
  "/pengaturan": ["settings.manage"],
};

export default async function FnbAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireFnbPage();
  const hidden = Object.entries(NEEDS).filter(([, any]) => !any.some((p) => can(ctx, p))).map(([href]) => href);
  return <AppShell hidden={hidden}>{children}</AppShell>;
}
