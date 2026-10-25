/** Menu aplikasi. `permission` kosong berarti semua staf. Hanya kenyamanan: server tetap memeriksa izin. */
export const NAV = [
  { href: "/", label: "Beranda", icon: "home", permission: null },
  { href: "/pengaturan", label: "Pengaturan", icon: "settings", permission: null },
] as const;

export type NavItem = (typeof NAV)[number];
