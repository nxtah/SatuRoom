"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  ["/", "Ringkasan", "⌂"], ["/pos", "POS", "+"], ["/pesanan", "Pesanan", "≡"], ["/kas", "Kas", "▤"],
  ["/dapur", "Dapur", "♨"], ["/stok", "Stok", "□"], ["/menu", "Menu", "◇"],
] as const;
const mobile = nav.filter(([href]) => ["/pos", "/pesanan", "/dapur", "/stok", "/menu"].includes(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const item = (href: string, label: string, icon: string) => {
    const on = href === "/" ? path === "/" : path.startsWith(href);
    return <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-bold ${on ? "bg-kitchen text-white" : "text-stone-600 hover:bg-white"}`}><span className="text-xl">{icon}</span><span>{label}</span></Link>;
  };
  return <div className="min-h-dvh md:grid md:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="hidden border-r border-orange-950/10 p-3 md:block lg:p-5"><div className="sticky top-5"><p className="mb-8 hidden text-xl font-extrabold lg:block">SatuRoom <span className="text-tomato">Rasa</span></p><nav className="grid gap-1">{nav.map(([h,l,i]) => item(h,l,i))}</nav></div></aside>
    <div className="min-w-0 pb-24 md:pb-0"><header className="sticky top-0 z-20 flex h-16 items-center border-b border-orange-950/10 bg-plate/90 px-4 backdrop-blur sm:px-8"><b>SatuRoom Rasa</b><span className="ml-auto rounded-full bg-basil/10 px-3 py-1 text-sm font-bold text-basil">Outlet utama</span></header>{children}</div>
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[1.6rem] border border-orange-950/10 bg-white/95 p-1.5 shadow-xl backdrop-blur md:hidden">{mobile.map(([h,l,i]) => { const on=path.startsWith(h); return <Link key={h} href={h} className={`flex h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-bold ${on ? "bg-kitchen text-white" : "text-stone-600"}`}><span className="text-lg">{i}</span>{l}</Link>; })}</nav>
  </div>;
}
