/**
 * Menu aplikasi. `permission` kosong berarti semua staf; `mobile: false` = hanya di menu samping
 * (di HP dibuka dari Pengaturan). Hanya kenyamanan: server tetap memeriksa izin.
 */
export const NAV = [
  { href: "/", label: "Beranda", icon: "home", permission: null, mobile: true },
  { href: "/jadwal", label: "Jadwal", icon: "schedule", permission: null, mobile: true },
  { href: "/tim", label: "Tim", icon: "teams", permission: null, mobile: true },
  { href: "/pemain", label: "Pemain", icon: "players", permission: null, mobile: true },
  { href: "/staf", label: "Staf", icon: "staff", permission: "staff.read", mobile: false },
  { href: "/pengaturan", label: "Pengaturan", icon: "settings", permission: null, mobile: true },
] as const;

export type NavItem = (typeof NAV)[number];
