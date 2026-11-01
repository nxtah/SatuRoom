"use client";

import { ImageIcon, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Img } from "@/components/img";
import { Button } from "@/components/ui/button";
import { thumb } from "@/lib/images";
import { rupiah } from "@/lib/money";
import type { CatalogItem } from "@/server/inventory";

export interface CartLine {
  key: string;
  itemId: string;
  variantId: string | null;
  qty: number;
  custom: Record<string, string>;
}

const input = "h-10 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch";

function lineInfo(items: CatalogItem[], l: CartLine) {
  const it = items.find((i) => i.id === l.itemId)!;
  const v = it.variants.find((x) => x.id === l.variantId) ?? null;
  return { it, v, price: it.price + (v?.extraPrice ?? 0) };
}

export function cartTotal(items: CatalogItem[], cart: CartLine[]) {
  return cart.reduce((s, l) => s + lineInfo(items, l).price * l.qty, 0);
}

export const cartPayload = (cart: CartLine[]) => cart.map(({ itemId, variantId, qty, custom }) => ({ itemId, variantId, qty, custom }));

/** Kartu produk: pilih varian (ukuran), isi isian kustom (nomor punggung), jumlah, lalu masuk keranjang. */
function ProductCard({ item, onAdd, maxQty }: { item: CatalogItem; onAdd: (l: Omit<CartLine, "key">) => void; maxQty: number }) {
  const [variant, setVariant] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const v = item.variants.find((x) => x.id === variant) ?? null;
  const stock = item.variants.length ? (v?.qty ?? 0) : item.qty;
  const soldOut = item.variants.length ? item.variants.every((x) => x.qty === 0) : item.qty === 0;
  const img = thumb(item.imageUrl, 480);

  function add() {
    if (item.variants.length && !v) return setError("Pilih ukuran/varian dulu.");
    for (const f of item.customFields) {
      const val = (custom[f.label] ?? "").trim();
      if (f.required && !val) return setError(`Isi ${f.label}.`);
      if (val && f.kind === "number" && !/^\d+$/.test(val)) return setError(`${f.label} harus angka.`);
    }
    setError(undefined);
    onAdd({ itemId: item.id, variantId: v?.id ?? null, qty, custom: Object.fromEntries(Object.entries(custom).filter(([, x]) => x.trim())) });
    setQty(1);
    setCustom({});
  }

  return (
    <li className="grid content-start overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-line">
      <div className="relative aspect-square bg-mist">
        {img ? <Img src={img} className="size-full object-cover" /> : <ImageIcon aria-hidden className="absolute inset-0 m-auto size-10 text-ink-soft/50" />}
        {item.category ? <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold">{item.category}</span> : null}
        {soldOut ? <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-sm font-extrabold text-white">Stok habis</span> : null}
      </div>
      <div className="grid gap-2 p-3">
        <p className="font-extrabold break-words">{item.name}</p>
        {item.description ? <p className="text-sm text-ink-soft">{item.description}</p> : null}
        <p className="font-bold">{rupiah(item.price + (v?.extraPrice ?? 0))}</p>
        {item.variants.length ? (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pilih varian">
            {item.variants.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={variant === x.id}
                disabled={x.qty === 0}
                onClick={() => { setVariant(x.id); setQty(1); }}
                className={`min-w-11 rounded-full border-2 px-3 py-1 text-sm font-bold transition disabled:opacity-35 disabled:line-through ${variant === x.id ? "border-pitch bg-pitch text-white" : "border-line hover:border-pitch"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
        ) : null}
        {item.customFields.map((f) => (
          <label key={f.label} className="grid gap-1 text-sm font-bold">
            {f.label}{f.required ? "" : " (boleh kosong)"}
            <input
              className={input}
              inputMode={f.kind === "number" ? "numeric" : "text"}
              maxLength={f.max}
              value={custom[f.label] ?? ""}
              onChange={(e) => setCustom((c) => ({ ...c, [f.label]: f.kind === "number" ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase() }))}
            />
          </label>
        ))}
        {!soldOut ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" aria-label="Kurangi" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus aria-hidden className="size-4" /></Button>
            <span className="w-6 text-center font-extrabold tabular-nums">{qty}</span>
            <Button size="sm" variant="ghost" aria-label="Tambah" disabled={qty >= Math.min(stock || 1, maxQty)} onClick={() => setQty((q) => q + 1)}><Plus aria-hidden className="size-4" /></Button>
            <Button size="sm" className="ml-auto" onClick={add}>Tambah</Button>
          </div>
        ) : null}
        {item.variants.length && v ? <p className="text-xs text-ink-soft">Stok {v.label}: {v.qty}</p> : !item.variants.length ? <p className="text-xs text-ink-soft">Stok {item.qty}</p> : null}
        {error ? <p className="text-sm font-bold text-flame">{error}</p> : null}
      </div>
    </li>
  );
}

/** Katalog dengan filter kategori + keranjang. */
export function StoreCart({ items, cart, setCart, maxQty = 100 }: { items: CatalogItem[]; cart: CartLine[]; setCart: (f: (c: CartLine[]) => CartLine[]) => void; maxQty?: number }) {
  const cats = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[], [items]);
  const [cat, setCat] = useState<string | null>(null);
  const shown = cat ? items.filter((i) => i.category === cat) : items;
  return (
    <div className="grid gap-3">
      {cats.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[null, ...cats].map((c) => (
            <button key={c ?? "all"} type="button" onClick={() => setCat(c)} className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold ${cat === c ? "bg-pitch text-white" : "bg-mist"}`}>
              {c ?? "Semua"}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
        {shown.map((i) => (
          <ProductCard key={i.id} item={i} maxQty={maxQty} onAdd={(l) => setCart((c) => [...c, { ...l, key: `${l.itemId}-${l.variantId}-${Date.now()}` }])} />
        ))}
      </ul>
      {cart.length ? (
        <section className="rounded-[1.5rem] bg-white p-4 ring-1 ring-line" aria-label="Keranjang">
          <p className="mb-2 flex items-center gap-2 font-extrabold"><ShoppingBag aria-hidden className="size-5" /> Keranjang</p>
          <ul className="grid gap-2">
            {cart.map((l) => {
              const { it, v, price } = lineInfo(items, l);
              return (
                <li key={l.key} className="flex items-start gap-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold break-words">{l.qty} × {it.name}{v ? ` (${v.label})` : ""}</span>
                    {Object.entries(l.custom).length ? <span className="text-ink-soft">{Object.entries(l.custom).map(([k, x]) => `${k}: ${x}`).join(" · ")}</span> : null}
                  </span>
                  <span className="font-bold tabular-nums">{rupiah(price * l.qty)}</span>
                  <button type="button" aria-label="Hapus" onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))} className="rounded-full p-1 text-ink-soft hover:bg-mist"><Trash2 aria-hidden className="size-4" /></button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
