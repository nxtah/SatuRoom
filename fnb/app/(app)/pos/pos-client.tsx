"use client";
import { useMemo, useState } from "react";
import type { Catalog } from "@/server/catalog";
import type { Order } from "@/server/orders";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Baru", preparing: "Dimasak", ready: "Siap", served: "Disajikan", completed: "Selesai", cancelled: "Batal", open: "Baru",
};

export function PosClient({ catalog, initialOrders }: { catalog: Catalog; initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<string>("all");
  const [type, setType] = useState<"dine_in" | "takeaway" | "pickup">("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () => catalog.items.filter((i) => i.available && (category === "all" || i.categoryId === category)),
    [catalog.items, category],
  );
  const lines = useMemo(
    () => catalog.items.filter((i) => cart[i.id]).map((i) => ({ item: i, qty: cart[i.id]! })),
    [catalog.items, cart],
  );
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  const add = (id: string, delta: number) => setCart((c) => {
    const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) };
    if (!next[id]) delete next[id];
    return next;
  });

  async function submit() {
    if (!lines.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type, customerName: customerName || undefined,
          lines: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Pesanan belum dapat disimpan.");
      setCart({}); setCustomerName("");
      setMessage("Pesanan masuk ke dapur.");
      setOrders(await fetch("/api/v1/orders").then((r) => r.json()));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
    <section>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={category === "all"} onClick={() => setCategory("all")}>Semua</Chip>
        {catalog.categories.map((c) => <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Chip>)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {items.map((i) => <button key={i.id} onClick={() => add(i.id, 1)} className="min-h-28 rounded-[1.5rem] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99]">
          <span className="font-extrabold text-ink">{i.name}</span>
          <span className="mt-1 block text-sm text-stone-500">{i.categoryName}</span>
          <span className="mt-4 block font-bold text-basil">{rupiah(i.price)}</span>
          {cart[i.id] ? <span className="mt-1 inline-block rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-bold text-kitchen">{cart[i.id]}x</span> : null}
        </button>)}
        {!items.length ? <p className="col-span-full rounded-[1.5rem] bg-white p-8 text-center text-stone-500">Belum ada menu tersedia. Tambah dari halaman Menu.</p> : null}
      </div>
      {orders.length ? <section className="mt-6 rounded-[2rem] bg-white p-5">
        <h2 className="font-extrabold">Pesanan aktif</h2>
        <div className="mt-3 grid gap-2">
          {orders.map((o) => <a key={o.id} href="/pesanan" className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3">
            <b>#{o.number}</b>
            <span className="text-sm text-stone-500">{o.type === "dine_in" ? "Dine in" : o.type === "takeaway" ? "Bungkus" : "Ambil"}{o.tableName ? ` · ${o.tableName}` : ""}</span>
            <span className="ml-auto rounded-full bg-basil/10 px-2.5 py-1 text-xs font-bold text-basil">{STATUS_LABEL[o.status] ?? o.status}</span>
            <b className="text-sm">{rupiah(o.total)}</b>
          </a>)}
        </div>
      </section> : null}
    </section>

    <aside className="h-fit rounded-[2rem] bg-white p-5 lg:sticky lg:top-4">
      <h2 className="text-xl font-extrabold">Keranjang</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([["dine_in", "Dine in"], ["takeaway", "Bungkus"], ["pickup", "Ambil"]] as const).map(([value, label]) =>
          <button key={value} onClick={() => setType(value)} className={`h-10 rounded-full text-sm font-bold ${type === value ? "bg-kitchen text-white" : "bg-stone-100 text-stone-600"}`}>{label}</button>)}
      </div>
      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan (opsional)" className="mt-3 h-11 w-full rounded-xl border border-stone-200 px-3" />
      <div className="mt-4 grid gap-2">
        {lines.map(({ item, qty }) => <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-stone-200 p-3">
          <div className="min-w-0 flex-1"><b className="block truncate text-sm">{item.name}</b><span className="text-xs text-stone-500">{rupiah(item.price)}</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => add(item.id, -1)} aria-label={`Kurangi ${item.name}`} className="size-8 rounded-full bg-stone-100 font-bold">−</button>
            <b className="w-6 text-center text-sm">{qty}</b>
            <button onClick={() => add(item.id, 1)} aria-label={`Tambah ${item.name}`} className="size-8 rounded-full bg-stone-100 font-bold">+</button>
          </div>
        </div>)}
        {!lines.length ? <p className="py-10 text-center text-stone-500">Pilih menu untuk mulai pesanan.</p> : null}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4"><span className="text-stone-600">Total</span><b className="text-2xl">{rupiah(total)}</b></div>
      {message ? <p className="mt-3 rounded-2xl bg-basil/10 p-3 text-sm font-bold text-basil">{message}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <button onClick={submit} disabled={busy || !lines.length} className="mt-4 h-13 w-full rounded-full bg-saffron font-extrabold text-kitchen disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan pesanan"}</button>
    </aside>
  </div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-kitchen text-white" : "bg-white text-stone-600"}`}>{children}</button>;
}
