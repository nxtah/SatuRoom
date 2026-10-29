/**
 * Izin Rasa. Server memeriksa izin di setiap aksi; menu yang disembunyikan di layar hanya
 * kenyamanan. Peran bawaan memetakan ke izin ini, peran custom memilih izinnya sendiri.
 */
export const PERMISSIONS = [
  "orders.sell",
  "kitchen.run",
  "cash.manage",
  "payments.void",
  "orders.discount",
  "orders.refund",
  "catalog.manage",
  "stock.manage",
  "purchases.manage",
  "reports.read",
  "expenses.manage",
  "staff.manage",
  "roles.manage",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, { label: string; hint: string }> = {
  "orders.sell": { label: "Jual di kasir", hint: "Buka pesanan, tambah menu, dan menerima pembayaran pesanan." },
  "kitchen.run": { label: "Jalankan dapur", hint: "Melihat antrean dan mengubah status masak." },
  "cash.manage": { label: "Kelola kas", hint: "Buka dan tutup shift, catat kas masuk dan keluar." },
  "payments.void": { label: "Batalkan pembayaran", hint: "Membatalkan pembayaran yang salah input, dengan alasan." },
  "orders.discount": { label: "Beri diskon", hint: "Memberi potongan harga pada pesanan, dengan alasan." },
  "orders.refund": { label: "Refund", hint: "Mengembalikan uang pelanggan setelah pesanan dibayar." },
  "catalog.manage": { label: "Kelola menu", hint: "Tambah kategori, stasiun, menu, dan ketersediaan." },
  "stock.manage": { label: "Kelola stok", hint: "Bahan, resep, stok masuk, dan penyesuaian." },
  "purchases.manage": { label: "Kelola pembelian", hint: "Supplier, pembelian, dan penerimaan barang." },
  "reports.read": { label: "Lihat laporan", hint: "Laporan penjualan, laba, dan kas." },
  "staff.manage": { label: "Kelola staf", hint: "Undang, ubah peran, dan nonaktifkan staf." },
  "roles.manage": { label: "Kelola peran", hint: "Membuat dan mengubah peran custom." },
  "expenses.manage": { label: "Kelola pengeluaran", hint: "Mencatat dan membatalkan pengeluaran operasional." },
  "settings.manage": { label: "Kelola pengaturan", hint: "Pajak, service charge, struk, meja, dan cabang." },
};

export const BUILTIN_ROLES = ["owner", "manager", "cashier", "server", "kitchen", "inventory", "accounting"] as const;
export type BuiltinRole = (typeof BUILTIN_ROLES)[number];

export const ROLE_LABEL: Record<BuiltinRole, string> = {
  owner: "Pemilik",
  manager: "Manajer",
  cashier: "Kasir",
  server: "Pelayan",
  kitchen: "Dapur",
  inventory: "Gudang",
  accounting: "Keuangan",
};

const GRANTS: Record<BuiltinRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: ["orders.sell", "kitchen.run", "cash.manage", "payments.void", "orders.discount", "orders.refund", "catalog.manage", "stock.manage", "purchases.manage", "reports.read", "expenses.manage", "settings.manage"],
  cashier: ["orders.sell", "cash.manage"],
  server: ["orders.sell"],
  kitchen: ["kitchen.run"],
  inventory: ["stock.manage", "purchases.manage"],
  accounting: ["cash.manage", "payments.void", "reports.read", "expenses.manage"],
};

export function permissionsFor(roles: readonly string[], custom: readonly (readonly string[])[] = []): Set<Permission> {
  const all = new Set<Permission>();
  for (const r of roles) for (const p of GRANTS[r as BuiltinRole] ?? []) all.add(p);
  for (const list of custom) for (const p of list) if ((PERMISSIONS as readonly string[]).includes(p)) all.add(p as Permission);
  return all;
}
