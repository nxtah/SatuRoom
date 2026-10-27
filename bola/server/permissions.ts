/**
 * Izin per peran. Server memeriksa izin ini di setiap aksi; menu yang disembunyikan di layar
 * hanya kenyamanan, bukan pengaman. Peran baru cukup ditambahkan di sini dan di enum database.
 */
export const ROLES = ["owner", "admin", "head_coach", "coach", "treasurer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Pemilik",
  admin: "Admin",
  head_coach: "Kepala pelatih",
  coach: "Pelatih",
  treasurer: "Bendahara",
};

export const PERMISSIONS = [
  "academy.update",
  "staff.read",
  "staff.manage",
  "teams.read_all",
  "teams.manage",
  "players.read_all",
  "players.manage",
  "guardians.read",
  "schedule.manage_all",
  "attendance.record_all",
  "billing.read",
  "billing.manage",
  "announcements.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const GRANTS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: [
    "staff.read",
    "staff.manage",
    "teams.read_all",
    "teams.manage",
    "players.read_all",
    "players.manage",
    "guardians.read",
    "schedule.manage_all",
    "attendance.record_all",
    "billing.read",
    "billing.manage",
    "announcements.manage",
  ],
  head_coach: [
    "staff.read",
    "teams.read_all",
    "teams.manage",
    "players.read_all",
    "players.manage",
    "schedule.manage_all",
    "attendance.record_all",
    "announcements.manage",
  ],
  // Pelatih tidak punya izin "_all": aksesnya dibatasi ke tim yang dia latih.
  coach: [],
  // Bendahara: iuran dan kontak orang tua untuk penagihan; tidak mengelola tim, jadwal, atau staf.
  treasurer: ["teams.read_all", "players.read_all", "guardians.read", "billing.read", "billing.manage"],
};

export function permissionsFor(roles: readonly Role[]): Set<Permission> {
  return new Set(roles.flatMap((r) => GRANTS[r]));
}
