"use client";
import { useMemo, useState } from "react";
import { computeTotals } from "@/lib/pricing";
import type { Catalog } from "@/server/catalog";
import type { Order } from "@/server/orders";
import type { DiningTable } from "@/server/tables";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Baru", preparing: "Dimasak", ready: "Siap", served: "Disajikan", completed: "Selesai", cancelled: "Batal", open: "Baru",
};

export function PosClient({ tables, catalog, initialOrders, servicePercent, taxPercent, canDiscount }: { tables: DiningTable[]; catalog: Catalog; initialOrders: Order[]; servicePercent: number; taxPercent: number; canDiscount: boolean }) {
  const [orders, setOrders] = useState(initialOrders);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picking, setPicking] = useState<Catalog["items"][number] | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [type, setType] = useState<"dine_in" | "takeaway" | "pickup">("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tableId, setTableId] = useState("");
  const [discType, setDiscType] = useState<"amount" | "percent">("percent");
  const [discValue, setDiscValue] = useState("");
  const [discReason, setDiscReason] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());

  const items = useMemo(
    () => catalog.items.filter((i) => i.available && (category === "all" || i.categoryId === category)),
    [catalog.items, category],
  );
  const lines = cart;
  const unit = (l: CartLine) => l.item.price + l.mods.reduce((s, m) => s + m.priceDelta, 0);
  const gross = lines.reduce((sum, l) => sum + unit(l) * l.qty, 0);
  const wantsDiscount = canDiscount && Number(discValue) > 0;
  const totals = computeTotals({ gross, discountType: wantsDiscount ? discType : null, discountValue: wantsDiscount ? Number(discValue) : 0, servicePercent, taxPercent });
  const total = totals.total;
  const cartQty = (itemId: string) => cart.filter((l) => l.item.id === itemId).reduce((s, l) => s + l.qty, 0);

  /** Menu tanpa pilihan langsung masuk keranjang; menu dengan varian/add-on membuka pilihan dulu. */
  const choose = (item: Catalog["items"][number]) => {
    if (item.groupIds.length) return setPicking(item);
    addLine(item, [], "");
  };
  const addLine = (item: Catalog["items"][number], mods: ModOption[], note: string) => setCart((c) => {
    const key = `${item.id}|${mods.map((m) => m.id).sort().join(",")}|${note}`;
    const found = c.find((l) => l.key === key);
    return found ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...c, { key, item, mods, note, qty: 1 }];
  });
  const bump = (key: string, delta: number) => setCart((c) => c.flatMap((l) => (l.key === key ? (l.qty + delta > 0 ? [{ ...l, qty: l.qty + delta }] : []) : [l])));

  async function submit() {
    if (!lines.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type, tableId: type === "dine_in" && tableId ? tableId : undefined, customerName: customerName || undefined, idempotencyKey: key,
          discountType: wantsDiscount ? discType : undefined, discountValue: wantsDiscount ? Number(discValue) : undefined, discountReason: wantsDiscount ? discReason : undefined,
          lines: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty, notes: l.note || undefined, modifierIds: l.mods.map((m) => m.id) })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Pesanan belum dapat disimpan.");
      setCart([]); setCustomerName(""); setTableId(""); setDiscValue(""); setDiscReason(""); setKey(crypto.randomUUID());
      setMessage(`Pesanan ${data.receiptNo} masuk ke dapur.`);
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
        {items.map((i) => <button key={i.id} onClick={() => choose(i)} className="min-h-28 rounded-[1.5rem] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99]">
          <span className="font-extrabold text-ink">{i.name}</span>
          <span className="mt-1 block text-sm text-stone-500">{i.categoryName}</span>
          <span className="mt-4 block font-bold text-basil">{rupiah(i.price)}</span>
          {i.groupIds.length ? <span className="mt-1 mr-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">Ada pilihan</span> : null}
          {cartQty(i.id) ? <span className="mt-1 inline-block rounded-full bg-saffron/20 px-2 py-0.5 text-xs font-bold text-kitchen">{cartQty(i.id)}x</span> : null}
        </button>)}
        {!items.length ? <p className="col-span-full rounded-[1.5rem] bg-white p-8 text-center text-stone-500">Belum ada menu tersedia. Tambah dari halaman Menu.</p> : null}
      </div>
      {orders.length ? <section className="mt-6 rounded-[2rem] bg-white p-5">
        <h2 className="font-extrabold">Pesanan aktif</h2>
        <div className="mt-3 grid gap-2">
          {orders.map((o) => <a key={o.id} href="/pesanan" className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3">
            <b>{o.receiptNo}</b>
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
      {type === "dine_in" && tables.length ? <select aria-label="Meja" value={tableId} onChange={(e) => setTableId(e.target.value)} className="mt-3 h-11 w-full rounded-xl border border-stone-200 bg-white px-3">
        <option value="">Pilih meja (opsional)</option>
        {tables.map((t) => <option key={t.id} value={t.id} disabled={!!t.order}>{t.name}{t.capacity ? ` · ${t.capacity} kursi` : ""}{t.order ? " · terpakai" : ""}</option>)}
      </select> : null}
      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan (opsional)" className="mt-3 h-11 w-full rounded-xl border border-stone-200 px-3" />
      <div className="mt-4 grid gap-2">
        {lines.map((l) => <div key={l.key} className="flex items-center gap-2 rounded-2xl border border-stone-200 p-3">
          <div className="min-w-0 flex-1">
            <b className="block truncate text-sm">{l.item.name}</b>
            {l.mods.length ? <span className="block text-xs text-stone-600">{l.mods.map((m) => m.name).join(", ")}</span> : null}
            {l.note ? <span className="block text-xs text-stone-600">Catatan: {l.note}</span> : null}
            <span className="text-xs text-stone-500">{rupiah(unit(l))}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => bump(l.key, -1)} aria-label={`Kurangi ${l.item.name}`} className="size-9 rounded-full bg-stone-100 font-bold">−</button>
            <b className="w-6 text-center text-sm">{l.qty}</b>
            <button onClick={() => bump(l.key, 1)} aria-label={`Tambah ${l.item.name}`} className="size-9 rounded-full bg-stone-100 font-bold">+</button>
          </div>
        </div>)}
        {!lines.length ? <p className="py-10 text-center text-stone-500">Pilih menu untuk mulai pesanan.</p> : null}
      </div>
      {canDiscount && lines.length ? <div className="mt-4 grid gap-2 rounded-2xl bg-stone-50 p-3">
        <div className="grid grid-cols-[6.5rem_1fr] gap-2">
          <select aria-label="Jenis diskon" value={discType} onChange={(e) => setDiscType(e.target.value as "amount" | "percent")} className="h-10 rounded-xl border border-stone-200 bg-white px-2 text-sm"><option value="percent">Diskon %</option><option value="amount">Diskon Rp</option></select>
          <input aria-label="Nilai diskon" type="number" min="0" value={discValue} onChange={(e) => setDiscValue(e.target.value)} placeholder="0" className="h-10 min-w-0 rounded-xl border border-stone-200 px-3 text-sm" />
        </div>
        {wantsDiscount ? <input aria-label="Alasan diskon" value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder="Alasan diskon (wajib)" className="h-10 rounded-xl border border-stone-200 px-3 text-sm" /> : null}
      </div> : null}
      <dl className="mt-4 grid gap-1 border-t border-stone-200 pt-4 text-sm text-stone-600">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(totals.gross)}</dd></div>
        {totals.discount > 0 ? <div className="flex justify-between"><dt>Diskon</dt><dd>-{rupiah(totals.discount)}</dd></div> : null}
        {totals.service > 0 ? <div className="flex justify-between"><dt>Service {servicePercent}%</dt><dd>{rupiah(totals.service)}</dd></div> : null}
        {totals.tax > 0 ? <div className="flex justify-between"><dt>Pajak {taxPercent}%</dt><dd>{rupiah(totals.tax)}</dd></div> : null}
      </dl>
      <div className="mt-2 flex items-center justify-between"><span className="text-stone-600">Total</span><b className="text-2xl">{rupiah(total)}</b></div>
      {message ? <p className="mt-3 rounded-2xl bg-basil/10 p-3 text-sm font-bold text-basil">{message}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <button onClick={submit} disabled={busy || !lines.length || (wantsDiscount && discReason.trim().length < 3)} className="mt-4 h-13 w-full rounded-full bg-saffron font-extrabold text-kitchen disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan pesanan"}</button>
    </aside>
    {picking ? <Picker item={picking} groups={catalog.groups.filter((g) => picking.groupIds.includes(g.id))} onClose={() => setPicking(null)} onAdd={(mods, note) => { addLine(picking, mods, note); setPicking(null); }} /> : null}
  </div>;
}

type ModOption = { id: string; name: string; priceDelta: number };
type CartLine = { key: string; item: Catalog["items"][number]; mods: ModOption[]; note: string; qty: number };

/** Lembar pilihan varian/add-on. Aturan minimal/maksimal ditegakkan lagi di server. */
function Picker({ item, groups, onClose, onAdd }: { item: Catalog["items"][number]; groups: Catalog["groups"]; onClose: () => void; onAdd: (mods: ModOption[], note: string) => void }) {
  const [picked, setPicked] = useState<Record<string, string[]>>(() => Object.fromEntries(groups.map((g) => [g.id, g.minSelect === 1 && g.maxSelect === 1 ? g.modifiers.filter((m) => m.available).slice(0, 1).map((m) => m.id) : []])));
  const [note, setNote] = useState("");
  const toggle = (g: Catalog["groups"][number], id: string) => setPicked((p) => {
    const cur = p[g.id] ?? [];
    if (g.maxSelect === 1) return { ...p, [g.id]: cur.includes(id) && g.minSelect === 0 ? [] : [id] };
    return { ...p, [g.id]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < g.maxSelect ? [...cur, id] : cur };
  });
  const mods = groups.flatMap((g) => g.modifiers.filter((m) => (picked[g.id] ?? []).includes(m.id)));
  const missing = groups.find((g) => (picked[g.id] ?? []).length < g.minSelect);
  return <div role="dialog" aria-modal="true" aria-label={`Pilihan ${item.name}`} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-plate p-5 sm:rounded-[2rem]">
      <div className="flex items-start gap-3"><h2 className="min-w-0 flex-1 text-xl font-extrabold">{item.name}</h2><button onClick={onClose} aria-label="Tutup" className="size-10 rounded-full bg-white font-bold">×</button></div>
      {groups.map((g) => <fieldset key={g.id} className="mt-4">
        <legend className="font-extrabold">{g.name} <span className="text-sm font-normal text-stone-600">{g.minSelect > 0 ? `Pilih ${g.minSelect === g.maxSelect ? g.minSelect : `${g.minSelect}–${g.maxSelect}`}` : `Opsional, maks. ${g.maxSelect}`}</span></legend>
        <div className="mt-2 grid gap-2">{g.modifiers.map((m) => {
          const on = (picked[g.id] ?? []).includes(m.id);
          return <label key={m.id} className={`flex min-h-12 items-center gap-3 rounded-2xl bg-white p-3 ${m.available ? "cursor-pointer" : "opacity-50"} ${on ? "ring-2 ring-saffron" : ""}`}>
            <input type={g.maxSelect === 1 ? "radio" : "checkbox"} name={g.id} disabled={!m.available} checked={on} onChange={() => toggle(g, m.id)} className="size-5 accent-kitchen" />
            <span className="flex-1 font-bold">{m.name}{m.available ? "" : " (habis)"}</span>
            <span className="text-sm text-stone-600">{m.priceDelta ? `+${rupiah(m.priceDelta)}` : "Gratis"}</span>
          </label>;
        })}</div>
      </fieldset>)}
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Catatan, misal: tanpa es" aria-label="Catatan item" className="mt-4 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" />
      {missing ? <p className="mt-3 text-sm font-bold text-red-700">Pilih {missing.name} dulu.</p> : null}
      <button disabled={!!missing} onClick={() => onAdd(mods, note.trim())} className="mt-4 h-12 w-full rounded-full bg-saffron font-extrabold text-kitchen disabled:opacity-40">Tambah, {rupiah(item.price + mods.reduce((s, m) => s + m.priceDelta, 0))}</button>
    </div>
  </div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-kitchen text-white" : "bg-white text-stone-600"}`}>{children}</button>;
}
