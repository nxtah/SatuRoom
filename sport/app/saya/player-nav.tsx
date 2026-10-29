"use client";

import { CalendarDays, ChartNoAxesCombined, House, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/saya", label: "Beranda", icon: House },
  { href: "/saya/jadwal", label: "Jadwal", icon: CalendarDays },
  { href: "/saya/kehadiran", label: "Hadir", icon: ChartNoAxesCombined },
  { href: "/saya/iuran", label: "Iuran", icon: ReceiptText },
  { href: "/saya/profil", label: "Profil", icon: UserRound },
] as const;

function active(pathname: string, href: string) {
  return href === "/saya" ? pathname === href : pathname.startsWith(href);
}

export function PlayerSideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu akun pemain">
      <ul className="grid gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = active(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                title={label}
                className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base ${
                  on ? "bg-pitch text-white shadow-[0_12px_24px_-16px_rgb(11_26_58/0.8)]" : "text-ink-soft hover:bg-chalk hover:text-ink"
                }`}
              >
                <Icon aria-hidden className={`size-5 ${on ? "text-ember" : ""}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PlayerBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu akun pemain"
      className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-line bg-chalk/95 p-1.5 shadow-[0_20px_40px_-20px_rgb(11_26_58/0.45)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = active(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[11px] font-bold transition sm:text-xs ${
                  on ? "bg-pitch text-white" : "text-ink-soft"
                }`}
              >
                <Icon aria-hidden className={`size-5 ${on ? "text-ember" : ""}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
