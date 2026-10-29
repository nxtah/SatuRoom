import type { Permission } from "@/server/permissions";

/**
 * Menu aplikasi. `permission` kosong berarti semua staf. Tab bawah HP maksimal 5: `mobile: false`
 * tidak pernah tampil di sana, `"overflow"` dilepas bila tab lebih dari 5 (semuanya bisa dibuka dari
 * halaman Lainnya). Hanya kenyamanan: server tetap memeriksa izin.
 */
export const NAV = [
  { href: "/", label: "Beranda", icon: "home", permission: null, mobile: true },
  { href: "/meja", label: "Lantai", icon: "floor", permission: "floor.view", mobile: true },
  { href: "/booking", label: "Booking", icon: "booking", permission: "bookings.manage", mobile: true },
  { href: "/member", label: "Member", icon: "members", permission: "members.read", mobile: "overflow" },
  { href: "/turnamen", label: "Turnamen", icon: "tournament", permission: "tournaments.read", mobile: true },
  { href: "/menu", label: "Menu", icon: "menu", permission: "menu.manage", mobile: "overflow" },
  { href: "/laporan", label: "Laporan", icon: "report", permission: "reports.read", mobile: "overflow" },
  { href: "/staf", label: "Staf", icon: "staff", permission: "staff.read", mobile: false },
  { href: "/pengaturan", label: "Lainnya", icon: "settings", permission: null, mobile: true },
] as const satisfies readonly { href: string; label: string; icon: string; permission: Permission | null; mobile: boolean | "overflow" }[];

export type NavItem = (typeof NAV)[number];

/** Item tab bawah HP untuk href yang diizinkan. */
export function mobileNav(allowed: string[]) {
  const items = NAV.filter((i) => i.mobile !== false && allowed.includes(i.href));
  return items.length > 5 ? items.filter((i) => i.mobile !== "overflow") : items;
}
