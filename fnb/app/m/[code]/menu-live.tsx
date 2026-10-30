"use client";
import { MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Img } from "@/components/img";
import { thumb } from "@/lib/images";
import type { PublicMenu } from "@/server/public-menu";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const POLL_MS = 5000;

/** Menu pelanggan. Memuat ulang data tiap beberapa detik selama halaman terlihat, sehingga perubahan harga, foto, dan stok dari kasir langsung tampil. */
export function MenuLive({ code, initial }: { code: string; initial: PublicMenu }) {
  const [menu, setMenu] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [offline, setOffline] = useState(false);
  const [closed, setClosed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let stop = false;
    async function tick() {
      if (stop) return;
      if (document.visibilityState === "visible") {
        const res = await fetch(`/api/public/menu/${encodeURIComponent(code)}`, { cache: "no-store" }).catch(() => null);
        if (!stop) {
          if (res?.ok) { setMenu(await res.json()); setOffline(false); setClosed(false); }
          else if (res?.status === 404) setClosed(true);
          else setOffline(true);
        }
      }
      if (!stop) timer.current = setTimeout(tick, POLL_MS);
    }
    timer.current = setTimeout(tick, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") { if (timer.current) clearTimeout(timer.current); void tick(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stop = true; if (timer.current) clearTimeout(timer.current); document.removeEventListener("visibilitychange", onVisible); };
  }, [code]);

  const term = q.trim().toLowerCase();
  const shown = useMemo(() => menu.categories
    .filter((c) => !cat || c.id === cat)
    .map((c) => ({ ...c, items: c.items.filter((i) => !term || `${i.name} ${i.description ?? ""}`.toLowerCase().includes(term)) }))
    .filter((c) => c.items.length), [menu, cat, term]);
  const b = menu.business;
  const logo = thumb(b.logoUrl, 160);

  return <main className="mx-auto min-h-dvh max-w-3xl bg-plate pb-12">
    <header className="bg-kitchen px-4 pt-8 pb-6 text-white sm:rounded-b-[2rem] sm:px-8">
      <div className="flex items-center gap-4">
        {logo ? <Img src={logo} alt="" className="size-16 shrink-0 rounded-2xl bg-white object-cover sm:size-20" /> : <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-2xl bg-saffron text-3xl font-extrabold text-kitchen sm:size-20">{b.name.trim().charAt(0).toUpperCase()}</span>}
        <div className="min-w-0"><h1 className="text-2xl leading-tight font-extrabold break-words sm:text-3xl">{b.name}</h1>
          {b.city || b.address ? <p className="mt-1 flex items-start gap-1.5 text-sm text-white/75"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0" /><span>{[b.address, b.city].filter(Boolean).join(", ")}</span></p> : null}</div>
      </div>
      <label className="mt-5 flex h-12 items-center gap-2 rounded-full bg-white px-4 text-kitchen"><Search aria-hidden className="size-5 shrink-0 text-stone-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu" aria-label="Cari menu" className="h-full min-w-0 flex-1 bg-transparent outline-none" /></label>
    </header>

    {closed ? <p role="status" className="mx-4 mt-4 rounded-2xl bg-saffron/25 p-3 text-center text-sm font-bold">Menu ini sedang ditutup oleh pemilik.</p> : offline ? <p role="status" className="mx-4 mt-4 rounded-2xl bg-stone-200 p-3 text-center text-sm font-bold">Koneksi terputus. Menampilkan menu terakhir.</p> : null}

    <nav aria-label="Kategori" className="sticky top-0 z-10 -mx-0 flex gap-2 overflow-x-auto bg-plate/95 px-4 py-3 backdrop-blur sm:px-8">
      {[{ id: "", name: "Semua" }, ...menu.categories].map((c) => <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold ${cat === c.id ? "bg-kitchen text-white" : "bg-white"}`}>{c.name}</button>)}
    </nav>

    <div className="grid gap-6 px-4 sm:px-8">
      {shown.map((c) => <section key={c.id} aria-labelledby={`k-${c.id}`}>
        <h2 id={`k-${c.id}`} className="text-xl font-extrabold">{c.name}</h2>
        {c.description ? <p className="text-sm text-stone-600">{c.description}</p> : null}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {c.items.map((i) => <li key={i.id} className={`flex gap-3 rounded-[1.4rem] bg-white p-3 ${i.available ? "" : "opacity-60"}`}>
            {thumb(i.imageUrl, 200) ? <Img src={thumb(i.imageUrl, 200) ?? undefined} alt="" loading="lazy" className="size-24 shrink-0 rounded-2xl object-cover" /> : null}
            <div className="min-w-0 flex-1"><p className="font-extrabold break-words">{i.name}</p>
              {i.description ? <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">{i.description}</p> : null}
              <p className="mt-1.5 flex items-center gap-2"><b className="tabular-nums">{rupiah(i.price)}</b>{!i.available ? <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-bold">Habis</span> : null}</p></div>
          </li>)}
        </ul>
      </section>)}
      {!shown.length ? <p className="rounded-[2rem] bg-white p-10 text-center text-stone-500">{term ? "Menu tidak ditemukan." : "Belum ada menu."}</p> : null}
    </div>
    <p className="mt-10 text-center text-xs text-stone-500">Harga dan ketersediaan diperbarui otomatis · SatuRoom Rasa</p>
  </main>;
}
