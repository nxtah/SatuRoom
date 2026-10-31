"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { OrderRow } from "@/server/inventory";

type Item = { id: string; name: string; unit: string; price: number; qty: number; description: string | null };
const STATUS = { pending: "Menunggu bayar", paid: "Dibayar, siap diambil", fulfilled: "Sudah diambil", cancelled: "Dibatalkan" };

export function ParentShop({ items, orders }: { items: Item[]; orders: OrderRow[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string }>();
  const [busy, setBusy] = useState(false);
  const total = items.reduce((s, i) => s + (cart[i.id] ?? 0) * i.price, 0);

  async function order(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await api("/me/player/orders", { body: { note: f.get("note") || undefined, lines: Object.entries(cart).filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty })) } });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error.message });
    setCart({});
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.id} className="grid gap-2 rounded-2xl bg-mist p-4">
              <span className="font-extrabold break-words">{i.name}</span>
              {i.description ? <span className="text-sm text-ink-soft">{i.description}</span> : null}
              <span className="font-bold">{rupiah(i.price)}</span>
              <span className="flex items-center gap-2">
                <Button size="sm" variant="outline" aria-label={`Kurangi ${i.name}`} disabled={!cart[i.id]} onClick={() => setCart((c) => ({ ...c, [i.id]: Math.max(0, (c[i.id] ?? 0) - 1) }))}>−</Button>
                <span className="w-6 text-center font-extrabold">{cart[i.id] ?? 0}</span>
                <Button size="sm" variant="outline" aria-label={`Tambah ${i.name}`} disabled={(cart[i.id] ?? 0) >= Math.min(i.qty, 10)} onClick={() => setCart((c) => ({ ...c, [i.id]: (c[i.id] ?? 0) + 1 }))}>+</Button>
              </span>
            </li>
          ))}
        </ul>
        <input name="note" maxLength={200} placeholder="Catatan, mis. ukuran M" aria-label="Catatan" className="h-11 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch" />
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
              {o.lines.map((l, i) => <li key={i}>{l.qty} × {l.itemName}</li>)}
            </ul>
            {o.status === "pending" ? <Button size="sm" variant="ghost" className="mt-1" onClick={() => cancel(o.id)}>Batalkan</Button> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
