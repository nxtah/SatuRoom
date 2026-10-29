"use client";

import { Armchair, CalendarClock, ChartNoAxesColumn, Coffee, House, IdCard, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNav, NAV } from "@/lib/nav";

const ICONS = { home: House, floor: Armchair, booking: CalendarClock, members: UsersRound, tournament: Trophy, menu: Coffee, report: ChartNoAxesColumn, staff: IdCard, settings: Settings } as const;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** `allowed`: href menu yang boleh tampil untuk peran pengguna (dihitung di server). Rel gelap di samping. */
export function SideNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu utama">
      <ul className="grid gap-1">
        {NAV.filter((i) => allowed.includes(i.href)).map((item) => {
          const Icon = ICONS[item.icon];
          const on = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                title={item.label}
                className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base ${
                  on ? "bg-chalk text-pitch shadow-[0_3px_0_var(--color-edge)]" : "text-white/70 hover:bg-white/10 hover:text-white"
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

/** Tab bawah di HP: menu utama dalam jangkauan jempol. */
export function BottomNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  const items = mobileNav(allowed);
  return (
    <nav aria-label="Menu utama" className="felt fixed inset-x-3 bottom-3 z-30 rounded-2xl p-1.5 shadow-[0_4px_0_var(--color-night),0_20px_40px_-18px_rgb(7_36_27/0.7)] md:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const lainnya = item.href === "/pengaturan" && !items.some((i) => i.href !== "/" && i.href !== "/pengaturan" && pathname.startsWith(i.href)) && pathname !== "/";
          const on = isActive(pathname, item.href) || lainnya;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition sm:text-xs ${on ? "bg-chalk text-pitch" : "text-white/70"}`}
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
