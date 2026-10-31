"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { OrderRow } from "@/server/inventory";

const cell = "h-10 w-full min-w-0 rounded-xl border-2 border-line bg-white px-2 outline-none focus:border-pitch";
type Item = { id: string; name: string; unit: string; price: number; qty: number };
const STATUS = { pending: "Menunggu bayar", paid: "Dibayar, belum diambil", fulfilled: "Selesai", cancelled: "Dibatalkan" };
const TONE = { pending: "bg-sun/40", paid: "bg-turf-soft text-pitch", fulfilled: "bg-mist", cancelled: "bg-mist text-ink-soft" };

export function NewSale({ items, players }: { items: Item[]; players: { id: string; name: string }[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const total = items.reduce((s, i) => s + (cart[i.id] ?? 0) * i.price, 0);

  if (!items.length) {
    return <EmptyState title="Belum ada barang dijual">Buka Stok, ubah barang, centang Dijual di toko, dan isi harga jualnya.</EmptyState>;
  }
  return (
    <form
      className="rise grid gap-3 rounded-[2rem] bg-chalk p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const playerId = String(f.get("playerId") || "");
        setBusy(true);
        const r = await api("/orders", {
          body: {
            playerId,
            buyerName: playerId ? players.find((p) => p.id === playerId)!.name : f.get("buyerName"),
            lines: Object.entries(cart).filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty })),
          },
        });
        setBusy(false);
        if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
        setError(undefined);
        setCart({});
        router.refresh();
      }}
    >
      <h2 className="font-extrabold">Catat penjualan</h2>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="grid gap-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 border-b border-mist py-2">
            <span className="min-w-0 flex-1">
              <span className="block font-bold break-words">{i.name}</span>
              <span className="text-xs text-ink-soft">{rupiah(i.price)} · stok {i.qty}</span>
            </span>
            <Button size="sm" variant="ghost" aria-label={`Kurangi ${i.name}`} disabled={!cart[i.id]} onClick={() => setCart((c) => ({ ...c, [i.id]: Math.max(0, (c[i.id] ?? 0) - 1) }))}>−</Button>
            <span className="w-6 text-center font-extrabold tabular-nums">{cart[i.id] ?? 0}</span>
            <Button size="sm" variant="ghost" aria-label={`Tambah ${i.name}`} disabled={(cart[i.id] ?? 0) >= i.qty} onClick={() => setCart((c) => ({ ...c, [i.id]: (c[i.id] ?? 0) + 1 }))}>+</Button>
          </li>
        ))}
      </ul>
      <label className="grid gap-1 text-sm font-bold">
        Pembeli
        <select name="playerId" className={cell} defaultValue="">
          <option value="">Bukan pemain / umum</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <input name="buyerName" placeholder="Nama pembeli (bila bukan pemain)" aria-label="Nama pembeli" className={cell} />
      <p className="text-lg font-extrabold">Total {rupiah(total)}</p>
      <Button type="submit" className="justify-self-start" disabled={busy || total === 0}>Buat pesanan</Button>
    </form>
  );
}

export function OrderList({ orders, today }: { orders: OrderRow[]; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function act(id: string, body: Record<string, unknown>) {
    setBusy(true);
    const r = await api(`/orders/${id}`, { body });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setError(undefined);
    router.refresh();
  }
  return (
    <section className="grid gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {orders.length === 0 ? <EmptyState title="Belum ada pesanan">Pesanan dari staf dan orang tua muncul di sini.</EmptyState> : null}
      {orders.map((o) => (
        <article key={o.id} className={`rise rounded-[1.5rem] bg-chalk p-4 ${o.status === "cancelled" ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 font-extrabold break-words">
              {o.playerId ? <Link href={`/pemain/${o.playerId}`} className="hover:underline">{o.buyerName}</Link> : o.buyerName}
            </span>
            {o.channel === "parent" ? <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold">Dari orang tua</span> : null}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[o.status]}`}>{STATUS[o.status]}</span>
          </div>
          <ul className="mt-1 text-sm">
            {o.lines.map((l, i) => <li key={i}>{l.qty} × {l.itemName} @ {rupiah(l.price)}</li>)}
          </ul>
          {o.note ? <p className="text-sm text-ink-soft">Catatan: {o.note}</p> : null}
          <p className="mt-1 font-bold">{rupiah(o.total)}</p>
          {o.status === "pending" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-ink-soft">Dibayar lewat</span>
              <Button size="sm" variant="dark" disabled={busy} onClick={() => act(o.id, { action: "pay", method: "cash", paidOn: today })}>Tunai</Button>
              <Button size="sm" variant="dark" disabled={busy} onClick={() => act(o.id, { action: "pay", method: "transfer", paidOn: today })}>Transfer</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm("Batalkan pesanan ini?") && act(o.id, { action: "cancel" })}>Batalkan</Button>
            </div>
          ) : null}
          {o.status === "paid" ? <Button size="sm" className="mt-2" disabled={busy} onClick={() => act(o.id, { action: "fulfill" })}>Sudah diambil</Button> : null}
        </article>
      ))}
    </section>
  );
}
