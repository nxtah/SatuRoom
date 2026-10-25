/**
 * Menu aplikasi. `permission` kosong berarti semua staf. Tab bawah HP maksimal 5: `mobile: false`
 * tidak pernah tampil di sana, `"overflow"` dilepas bila tab lebih dari 5 (keduanya bisa dibuka
 * dari Pengaturan). Hanya kenyamanan: server tetap memeriksa izin.
 */
export const NAV = [
  { href: "/", label: "Beranda", icon: "home", permission: null, mobile: true },
  { href: "/jadwal", label: "Jadwal", icon: "schedule", permission: null, mobile: true },
  { href: "/tim", label: "Tim", icon: "teams", permission: null, mobile: "overflow" },
  { href: "/pemain", label: "Pemain", icon: "players", permission: null, mobile: true },
  { href: "/iuran", label: "Iuran", icon: "billing", permission: "billing.read", mobile: true },
  { href: "/staf", label: "Staf", icon: "staff", permission: "staff.read", mobile: false },
  { href: "/pengaturan", label: "Pengaturan", icon: "settings", permission: null, mobile: true },
] as const;

export type NavItem = (typeof NAV)[number];

/** Item tab bawah HP untuk href yang diizinkan. */
export function mobileNav(allowed: string[]) {
  const items = NAV.filter((i) => i.mobile !== false && allowed.includes(i.href));
  return items.length > 5 ? items.filter((i) => i.mobile !== "overflow") : items;
}
