import { MODULES } from "./modules";

/**
 * Menu aplikasi, dikelompokkan per kategori. `permission` kosong berarti semua staf. Tab bawah HP
 * maksimal 5: `mobile: false` tidak pernah tampil di sana, `"overflow"` dilepas bila tab lebih
 * dari 5 (keduanya bisa dibuka dari Pengaturan). Hanya kenyamanan: server tetap memeriksa izin.
 */
export const NAV = [
  { href: "/", label: "Beranda", icon: "home", group: "", permission: null, mobile: true },
  { href: "/jadwal", label: "Jadwal", icon: "schedule", group: "Latihan", permission: null, mobile: true },
  { href: "/program", label: "Program", icon: "programs", group: "Latihan", permission: null, mobile: false },
  { href: "/pemain", label: "Pemain", icon: "players", group: "Pemain dan tim", permission: null, mobile: true },
  { href: "/tim", label: "Tim", icon: "teams", group: "Pemain dan tim", permission: null, mobile: "overflow" },
  { href: "/iuran", label: "Iuran", icon: "billing", group: "Keuangan", permission: "billing.read", mobile: true },
  { href: "/pengumuman", label: "Pengumuman", icon: "announce", group: "Komunikasi", permission: null, mobile: "overflow" },
  { href: "/staf", label: "Staf", icon: "staff", group: "Tim kerja dan akses", permission: "staff.read", mobile: false },
  { href: "/absensi-staf", label: "Absensi staf", icon: "clock", group: "Tim kerja dan akses", permission: null, mobile: "overflow" },
  { href: "/staf/peran", label: "Peran dan izin", icon: "roles", group: "Tim kerja dan akses", permission: "roles.manage", mobile: false },
  { href: "/aktivitas", label: "Jejak aktivitas", icon: "audit", group: "Tim kerja dan akses", permission: "audit.read", mobile: false },
  { href: "/pengaturan", label: "Pengaturan", icon: "settings", group: "Akademi", permission: null, mobile: true },
] as const;

export type NavItem = (typeof NAV)[number];

/** Menu yang boleh tampil: punya izin dan modulnya menyala. */
export function allowedHrefs(can: (p: NonNullable<NavItem["permission"]>) => boolean, modules: ReadonlySet<string>, extra: string[] = []) {
  const off = new Set(MODULES.filter((m) => !modules.has(m.key)).flatMap((m) => [...m.hrefs] as string[]));
  return [...NAV.filter((i) => !i.permission || can(i.permission)).map((i) => i.href as string), ...extra].filter((h) => !off.has(h));
}

/** Item tab bawah HP untuk href yang diizinkan. */
export function mobileNav(allowed: string[]) {
  const items = NAV.filter((i) => i.mobile !== false && allowed.includes(i.href));
  return items.length > 5 ? items.filter((i) => i.mobile !== "overflow") : items;
}

/** Menu yang diizinkan, dikelompokkan sesuai urutan NAV. */
export function navGroups(allowed: string[]) {
  const groups: { title: string; items: NavItem[] }[] = [];
  for (const item of NAV) {
    if (!allowed.includes(item.href)) continue;
    const last = groups.at(-1);
    if (last && last.title === item.group) last.items.push(item);
    else groups.push({ title: item.group, items: [item] });
  }
  return groups;
}

/** Menu aktif: awalan terpanjang yang cocok, supaya /staf/peran tidak ikut menyalakan /staf. */
export function activeHref(pathname: string, hrefs: readonly string[]) {
  if (pathname === "/") return "/";
  return hrefs.filter((h) => h !== "/" && (pathname === h || pathname.startsWith(`${h}/`))).sort((a, b) => b.length - a.length)[0];
}
