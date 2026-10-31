"use client";

import { BookOpen, CalendarDays, History, House, IdCard, KeyRound, Megaphone, Settings, Shirt, UsersRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHref, mobileNav, navGroups } from "@/lib/nav";

const ICONS = {
  home: House,
  schedule: CalendarDays,
  teams: Shirt,
  players: UsersRound,
  staff: IdCard,
  roles: KeyRound,
  audit: History,
  billing: Wallet,
  settings: Settings,
  announce: Megaphone,
} as const;

const linkClass = (on: boolean) =>
  `flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[11px] leading-tight font-bold transition lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-left lg:text-[15px] ${
    on ? "bg-pitch text-white shadow-[0_12px_24px_-16px_rgb(11_26_58/0.8)]" : "text-ink-soft hover:bg-chalk hover:text-ink"
  }`;

/** `allowed`: href menu yang boleh tampil untuk peran pengguna (dihitung di server). */
export function SideNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  const groups = navGroups(allowed);
  const current = activeHref(pathname, allowed);
  return (
    <nav aria-label="Menu utama" className="grid gap-3 lg:gap-4">
      {groups.map((g, gi) => (
        <div key={g.title || "utama"} className={gi ? "border-t border-line pt-3 lg:border-0 lg:pt-0" : ""}>
          {g.title ? <p className="mb-1 hidden px-4 text-xs font-extrabold tracking-wide text-ink-soft/80 uppercase lg:block">{g.title}</p> : null}
          <ul className="grid gap-1">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const on = current === item.href;
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={on ? "page" : undefined} title={item.label} className={linkClass(on)}>
                    <Icon aria-hidden className={`size-5 shrink-0 ${on ? "text-ember" : ""}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="border-t border-line pt-3">
        <a href="/docs" target="_blank" rel="noopener" title="Panduan" className={linkClass(false)}>
          <BookOpen aria-hidden className="size-5 shrink-0" />
          Panduan
        </a>
      </div>
    </nav>
  );
}

/** Tab bawah di HP: menu utama dalam jangkauan jempol. Lebar kolom mengikuti jumlah menu. */
export function BottomNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  const items = mobileNav(allowed);
  const current = activeHref(pathname, allowed);
  const inTabs = items.some((i) => i.href === current);
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-line bg-chalk/95 p-1.5 shadow-[0_20px_40px_-20px_rgb(11_26_58/0.45)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          // Halaman yang tidak punya tab (mis. Staf) menyalakan Pengaturan, tempat menu lainnya berada.
          const on = current === item.href || (item.href === "/pengaturan" && !inTabs && pathname !== "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[11px] font-bold transition sm:text-xs ${
                  on ? "bg-pitch text-white" : "text-ink-soft"
                }`}
              >
                <Icon aria-hidden className={`size-5 ${on ? "text-ember" : ""}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
