import { AppShell } from "@/components/app-shell";
import type { Permission } from "@/lib/permissions";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";

/** Menu yang tampil mengikuti izin. Server tetap memeriksa izin di setiap aksi. */
const NEEDS: Record<string, Permission[]> = {
  "/pos": ["orders.sell"],
  "/pesanan": ["orders.sell", "cash.manage", "kitchen.run"],
  "/dapur": ["kitchen.run"],
  "/kas": ["cash.manage"],
  "/stok": ["stock.manage"],
  "/pembelian": ["purchases.manage"],
  "/menu": ["catalog.manage", "orders.sell"],
  "/pengeluaran": ["expenses.manage"],
  "/laporan": ["reports.read"],
  "/staf": ["staff.manage"],
  "/pengaturan": ["settings.manage"],
};

export default async function FnbAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireFnbPage();
  const hidden = Object.entries(NEEDS).filter(([, any]) => !any.some((p) => can(ctx, p))).map(([href]) => href);
  return <AppShell hidden={hidden}>{children}</AppShell>;
}
