"use client";

import { CalendarDays, House, IdCard, Megaphone, Settings, Shirt, UsersRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNav, NAV } from "@/lib/nav";

const ICONS = { home: House, schedule: CalendarDays, teams: Shirt, players: UsersRound, staff: IdCard, billing: Wallet, settings: Settings, announce: Megaphone } as const;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** `allowed`: href menu yang boleh tampil untuk peran pengguna (dihitung di server). */
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
                className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base ${
                  on ? "bg-pitch text-white shadow-[0_12px_24px_-16px_rgb(13_59_46/0.8)]" : "text-ink-soft hover:bg-chalk hover:text-ink"
                }`}
              >
                <Icon aria-hidden className="size-5" />
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
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-line bg-chalk/95 p-1.5 shadow-[0_20px_40px_-20px_rgb(13_59_46/0.45)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const on = isActive(pathname, item.href) || (item.href === "/pengaturan" && !items.some((i) => i.href !== "/" && pathname.startsWith(i.href)) && pathname !== "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[11px] font-bold transition sm:text-xs ${
                  on ? "bg-pitch text-white" : "text-ink-soft"
                }`}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
