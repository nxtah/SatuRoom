"use client";

import { ChevronDown, Ellipsis, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { LogoMark } from "./maskot";
import { isGroup, NAV, type NavEntry, type NavGroup, type NavLeaf } from "./nav-config";

const MAIN = ["/", "/pos", "/pesanan", "/dapur"];

/** Buang menu yang tidak boleh dilihat peran ini; grup tanpa isi ikut hilang. */
function visible(hidden: string[]): NavEntry[] {
  return NAV.flatMap((e): NavEntry[] => {
    if (!isGroup(e)) return hidden.includes(e.href) ? [] : [e];
    const children = e.children.filter((c) => !hidden.includes(c.href));
    return children.length ? [{ ...e, children }] : [];
  });
}

export function AppShell({ children, hidden = [] }: { children: React.ReactNode; hidden?: string[] }) {
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  const [flyout, setFlyout] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const entries = visible(hidden);
  const leaves: NavLeaf[] = entries.flatMap((e) => (isGroup(e) ? e.children : [e]));
  // Halaman aktif = alamat terpanjang yang cocok, supaya "/laporan" tidak ikut menyala di "/laporan/penjualan".
  const active = leaves.filter((l) => (l.href === "/" ? path === "/" : path === l.href || path.startsWith(`${l.href}/`))).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const on = (href: string) => href === active;
  const groupOn = (g: NavGroup) => g.children.some((c) => on(c.href));
  const mobile = leaves.filter((l) => MAIN.includes(l.href));
  const close = () => { setSheet(false); setFlyout(null); };

  const link = (l: NavLeaf, cls: string) => (
    <Link key={l.href} href={l.href} onClick={close} aria-current={on(l.href) ? "page" : undefined} className={cls + (on(l.href) ? " bg-saffron text-kitchen" : "")}>
      <l.icon aria-hidden className="size-5 shrink-0" />
      <span>{l.label}</span>
    </Link>
  );
  const sideCls = "flex items-center gap-3 rounded-2xl px-4 py-2.5 font-bold transition ";
  const idle = " text-white/75 hover:bg-white/10 hover:text-white";

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[272px_minmax(0,1fr)]">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-kitchen focus:px-4 focus:py-2 focus:text-white">
        Lewati ke isi
      </a>
      <aside className="hidden p-3 md:block">
        <div className="sticky top-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-4 overflow-y-auto rounded-[2rem] bg-kitchen p-3 text-white lg:p-4">
          <div className="hidden px-2 pt-1 lg:block"><Brand tone="white" /></div>
          <div className="mx-auto pt-3 lg:hidden"><LogoMark className="h-10" /></div>
          {/* Layar lebar: grup bisa dibuka-tutup. */}
          <nav aria-label="Menu utama" className="hidden gap-1 lg:grid">
            {entries.map((e) => {
              if (!isGroup(e)) return link(e, sideCls + (on(e.href) ? "" : idle));
              const open = manual[e.label] ?? groupOn(e);
              return (
                <div key={e.label}>
                  <button type="button" aria-expanded={open} onClick={() => setManual((m) => ({ ...m, [e.label]: !open }))} className={`flex w-full items-center gap-3 text-left rounded-2xl px-4 py-2.5 font-bold transition ${groupOn(e) ? "text-saffron" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
                    <e.icon aria-hidden className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">{e.label}</span>
                    <ChevronDown aria-hidden className={`ml-auto size-4 transition ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open ? <div className="mt-1 ml-5 grid gap-0.5 border-l border-white/15 pl-2">{e.children.map((c) => link(c, sideCls + "py-2 text-[15px]" + (on(c.href) ? "" : idle)))}</div> : null}
                </div>
              );
            })}
          </nav>
          {/* Tablet: ikon saja; grup membuka daftar di samping. */}
          <nav aria-label="Menu utama" className="grid gap-1 lg:hidden">
            {entries.map((e) => {
              const Icon = e.icon;
              const lit = isGroup(e) ? groupOn(e) || flyout === e.label : on(e.href);
              const cls = `flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-bold leading-tight transition ${lit ? "bg-saffron text-kitchen" : "text-white/75 hover:bg-white/10 hover:text-white"}`;
              if (!isGroup(e)) return <Link key={e.href} href={e.href} onClick={close} aria-current={on(e.href) ? "page" : undefined} className={cls}><Icon aria-hidden className="size-5" /><span>{e.label}</span></Link>;
              return <button key={e.label} type="button" aria-expanded={flyout === e.label} onClick={() => setFlyout(flyout === e.label ? null : e.label)} className={cls}><Icon aria-hidden className="size-5" /><span>{e.label}</span></button>;
            })}
          </nav>
          <p className="mt-auto hidden rounded-2xl bg-white/8 p-4 text-sm text-white/70 lg:block">
            Pesanan, dapur, stok, dan kas terhubung. Satu input, semua ikut berubah.
          </p>
        </div>
      </aside>
      {flyout ? (
        <>
          <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-30 hidden cursor-default md:block lg:hidden" onClick={() => setFlyout(null)} />
          <div role="menu" className="fixed top-3 bottom-3 left-[100px] z-40 hidden w-64 content-start gap-1 overflow-y-auto rounded-[1.5rem] bg-kitchen p-3 shadow-xl md:grid lg:hidden">
            <p className="px-4 pt-1 pb-2 text-sm font-bold text-saffron">{flyout}</p>
            {entries.filter(isGroup).find((g) => g.label === flyout)?.children.map((c) => link(c, sideCls + (on(c.href) ? "" : " text-white/85 hover:bg-white/10")))}
          </div>
        </>
      ) : null}
      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex h-16 items-center bg-plate/90 px-4 backdrop-blur sm:px-8 md:hidden">
          <Brand />
        </header>
        <div id="isi">{children}</div>
      </div>
      <nav aria-label="Menu cepat" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[1.6rem] bg-kitchen p-1.5 shadow-xl md:hidden">
        {mobile.map((l) => (
          <Link key={l.href} href={l.href} onClick={close} aria-current={on(l.href) ? "page" : undefined} className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ${on(l.href) ? "bg-saffron text-kitchen" : "text-white/75"}`}>
            <l.icon aria-hidden className="size-5" />
            {l.label}
          </Link>
        ))}
        <button type="button" aria-expanded={sheet} aria-controls="menu-lainnya" onClick={() => setSheet((v) => !v)} className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ${sheet || leaves.some((l) => !MAIN.includes(l.href) && on(l.href)) ? "bg-saffron text-kitchen" : "text-white/75"}`}>
          {sheet ? <X aria-hidden className="size-5" /> : <Ellipsis aria-hidden className="size-5" />}
          Lainnya
        </button>
        {sheet ? (
          <div id="menu-lainnya" className="absolute right-0 bottom-full mb-2 max-h-[70dvh] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-[1.5rem] bg-kitchen p-2 shadow-xl">
            {entries.filter((e) => isGroup(e) || !MAIN.includes(e.href)).map((e) => (
              <div key={isGroup(e) ? e.label : e.href} className="mb-1">
                {isGroup(e) ? <p className="px-4 pt-2 pb-1 text-xs font-bold tracking-wide text-saffron uppercase">{e.label}</p> : null}
                {(isGroup(e) ? e.children : [e]).map((c) => link(c, "flex items-center gap-3 rounded-2xl px-4 py-3 font-bold " + (on(c.href) ? "" : "text-white/85 active:bg-white/10")))}
              </div>
            ))}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
