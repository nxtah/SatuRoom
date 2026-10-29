/**
 * Izin per peran. Server memeriksa izin ini di setiap aksi; menu yang disembunyikan di layar
 * hanya kenyamanan, bukan pengaman. Peran baru cukup ditambahkan di sini dan di enum database.
 */
export const ROLES = ["owner", "manager", "host", "server", "referee"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Pemilik",
  manager: "Manajer",
  host: "Host meja",
  server: "Pelayan",
  referee: "Wasit",
};

export const ROLE_HINT: Record<Role, string> = {
  owner: "Semua akses, termasuk staf dan pengaturan.",
  manager: "Mengelola meja, member, menu, turnamen, dan laporan.",
  host: "Buka dan tutup meja, booking, member, dan pembayaran.",
  server: "Melihat lantai dan mencatat pesanan makanan dan minuman.",
  referee: "Menjalankan turnamen dan mengisi skor.",
};

export const PERMISSIONS = [
  "floor.view",
  "sessions.run",
  "orders.add",
  "bookings.manage",
  "members.read",
  "members.manage",
  "menu.manage",
  "tournaments.read",
  "tournaments.manage",
  "tournaments.score",
  "reports.read",
  "tables.manage",
  "settings.manage",
  "staff.read",
  "staff.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const GRANTS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: [
    "floor.view",
    "sessions.run",
    "orders.add",
    "bookings.manage",
    "members.read",
    "members.manage",
    "menu.manage",
    "tournaments.read",
    "tournaments.manage",
    "tournaments.score",
    "reports.read",
    "tables.manage",
    "settings.manage",
    "staff.read",
  ],
  host: ["floor.view", "sessions.run", "orders.add", "bookings.manage", "members.read", "members.manage", "tournaments.read"],
  server: ["floor.view", "orders.add", "members.read"],
  referee: ["floor.view", "members.read", "tournaments.read", "tournaments.score"],
};

export function permissionsFor(roles: readonly Role[]): Set<Permission> {
  return new Set(roles.flatMap((r) => GRANTS[r]));
}
