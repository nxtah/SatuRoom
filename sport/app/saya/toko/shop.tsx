"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import { cartPayload, cartTotal, StoreCart, type CartLine } from "@/components/store-cart";
import type { CatalogItem, OrderRow } from "@/server/inventory";

const STATUS = { pending: "Menunggu bayar", paid: "Dibayar, siap diambil", fulfilled: "Sudah diambil", cancelled: "Dibatalkan" };

export function ParentShop({ items, orders }: { items: CatalogItem[]; orders: OrderRow[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string }>();
  const [busy, setBusy] = useState(false);
  const total = cartTotal(items, cart);

  async function order(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await api("/me/player/orders", { body: { note: f.get("note") || undefined, lines: cartPayload(cart) } });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error.message });
    setCart([]);
    setMsg({ tone: "success", text: "Pesanan terkirim. Silakan bayar ke akademi." });
    router.refresh();
  }
  async function cancel(orderId: string) {
    if (!confirm("Batalkan pesanan ini?")) return;
    const r = await api("/me/player/orders", { method: "DELETE", body: { orderId } });
    if (!r.ok) return setMsg({ tone: "error", text: r.error.message });
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
      <form onSubmit={order} className="rise grid gap-3 rounded-[2rem] bg-chalk p-5">
        {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
        {items.length === 0 ? <p className="text-ink-soft">Belum ada barang yang dijual.</p> : null}
        <StoreCart items={items} cart={cart} setCart={setCart} maxQty={10} />
        <input name="note" maxLength={200} placeholder="Catatan untuk akademi (boleh kosong)" aria-label="Catatan" className="h-11 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-extrabold">Total {rupiah(total)}</span>
          <Button type="submit" disabled={busy || total === 0}>Pesan</Button>
        </div>
      </form>
      <section className="rise grid gap-2">
        <h2 className="text-lg font-extrabold">Pesanan saya</h2>
        {orders.length === 0 ? <p className="text-sm text-ink-soft">Belum ada pesanan.</p> : null}
        {orders.map((o) => (
          <article key={o.id} className="rounded-[1.5rem] bg-chalk p-4">
            <p className="flex flex-wrap justify-between gap-2 font-bold">
              <span>{rupiah(o.total)}</span>
              <span className="text-sm">{STATUS[o.status]}</span>
            </p>
            <ul className="text-sm text-ink-soft">
              {o.lines.map((l, i) => <li key={i}>{l.qty} × {l.itemName}{l.variantLabel ? ` (${l.variantLabel})` : ""}{Object.keys(l.custom ?? {}).length ? ` · ${Object.entries(l.custom).map(([k, v]) => `${k} ${v}`).join(", ")}` : ""}</li>)}
            </ul>
            {o.status === "pending" ? <Button size="sm" variant="ghost" className="mt-1" onClick={() => cancel(o.id)}>Batalkan</Button> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
