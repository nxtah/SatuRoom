"use client";

import { BookOpen, ChefHat, ClipboardList, Home, Landmark, Package, ReceiptText, ShoppingBasket, Store, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { LogoMark } from "./maskot";

const nav: readonly (readonly [string, string, LucideIcon])[] = [
  ["/", "Ringkasan", Home],
  ["/pos", "POS", Store],
  ["/pesanan", "Pesanan", ClipboardList],
  ["/dapur", "Dapur", ChefHat],
  ["/kas", "Kas", Landmark],
  ["/stok", "Stok", Package],
  ["/pembelian", "Pembelian", ShoppingBasket],
  ["/menu", "Menu", BookOpen],
  ["/laporan", "Laporan", TrendingUp],
];
const mobile = nav.filter(([href]) => ["/pos", "/pesanan", "/dapur", "/stok", "/menu"].includes(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-kitchen focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke isi
      </a>
      <aside className="hidden p-3 md:block">
        <div className="sticky top-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-6 overflow-y-auto rounded-[2rem] bg-kitchen p-3 text-white lg:p-5">
          <div className="hidden px-2 pt-1 lg:block"><Brand tone="white" /></div>
          <div className="mx-auto pt-3 lg:hidden"><LogoMark className="h-10" /></div>
          <nav aria-label="Menu utama" className="grid gap-1">
            {nav.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                aria-current={on(href) ? "page" : undefined}
                className={`flex items-center justify-center gap-3 rounded-2xl px-3 py-3 font-bold transition lg:justify-start lg:px-4 ${on(href) ? "bg-saffron text-kitchen" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
                <span className="sr-only lg:hidden">{label}</span>
              </Link>
            ))}
          </nav>
          <p className="mt-auto hidden rounded-2xl bg-white/8 p-4 text-sm text-white/70 lg:block">
            Pesanan, dapur, stok, dan kas terhubung. Satu input, semua ikut berubah.
          </p>
        </div>
      </aside>
      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex h-16 items-center bg-plate/90 px-4 backdrop-blur sm:px-8 md:hidden">
          <Brand />
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-basil/10 px-3 py-1 text-sm font-bold text-basil"><ReceiptText aria-hidden className="size-4" />Outlet utama</span>
        </header>
        <div id="isi">{children}</div>
      </div>
      <nav aria-label="Menu cepat" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[1.6rem] bg-kitchen p-1.5 shadow-xl md:hidden">
        {mobile.map(([href, label, Icon]) => (
          <Link key={href} href={href} aria-current={on(href) ? "page" : undefined} className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ${on(href) ? "bg-saffron text-kitchen" : "text-white/75"}`}>
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
