"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSoft, call, Field, input, Modal, rupiah, Toggle } from "@/components/ui";
import type { OutletItem } from "@/server/outlet-items";

export function OutletItemsManager({ branches, current, items }: { branches: { id: string; name: string }[]; current: string; items: OutletItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [item, setItem] = useState<OutletItem | null>(null);
  const [stockFor, setStockFor] = useState<OutletItem | null>(null);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = items.filter((i) => `${i.name} ${i.sku ?? ""} ${i.categoryName}`.toLowerCase().includes(q.toLowerCase()));
  const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await call(`/api/v1/branches/${current}/items/${item!.id}`, "PUT", { price: num(f.get("price")), cost: num(f.get("cost")), isAvailable: available, minStock: num(f.get("minStock")) });
    setBusy(false);
    if (r.error) return setError(r.error);
    setItem(null); router.refresh();
  }
  async function adjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await call(`/api/v1/branches/${current}/items/${stockFor!.id}/stock`, "POST", { quantity: Number(f.get("quantity")), reason: f.get("reason") });
    setBusy(false);
    if (r.error) return setError(r.error);
    setStockFor(null); router.refresh();
  }
  return <div className="mt-5 grid gap-4">
    <div className="flex flex-wrap gap-3">
      <select aria-label="Cabang" value={current} onChange={(e) => router.push(`/cabang/barang?cabang=${e.target.value}`)} className="h-11 rounded-xl border border-stone-300 bg-white px-3 font-bold">{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <input aria-label="Cari menu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu, SKU, kategori" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 px-3" />
    </div>
    <div className="overflow-x-auto rounded-[2rem] bg-white p-3">
      <table className="w-full min-w-max text-sm">
        <thead><tr className="border-b border-stone-200 text-left text-stone-600"><th className="px-3 py-2">Menu</th><th className="px-3 py-2 text-right">Harga dasar</th><th className="px-3 py-2 text-right">Harga cabang</th><th className="px-3 py-2 text-right">HPP cabang</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Stok</th><th className="px-3 py-2" /></tr></thead>
        <tbody className="divide-y divide-stone-100">{shown.map((i) => <tr key={i.id}>
          <td className="px-3 py-2"><b>{i.name}</b><span className="block text-xs text-stone-500">{i.categoryName}{i.sku ? ` · ${i.sku}` : ""}</span></td>
          <td className="px-3 py-2 text-right tabular-nums">{rupiah(i.basePrice)}</td>
          <td className="px-3 py-2 text-right tabular-nums">{i.price === null ? <span className="text-stone-400">ikut dasar</span> : rupiah(i.price)}</td>
          <td className="px-3 py-2 text-right tabular-nums">{i.cost === null ? <span className="text-stone-400">ikut dasar</span> : rupiah(i.cost)}</td>
          <td className="px-3 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${i.isAvailable ? "bg-basil/10 text-basil" : "bg-stone-200 text-stone-600"}`}>{i.isAvailable ? "Dijual" : "Tidak dijual"}</span></td>
          <td className="px-3 py-2 text-right tabular-nums">{i.trackStock ? <span className={i.minStock !== null && i.stock <= i.minStock ? "font-bold text-chili" : ""}>{i.stock}</span> : <span className="text-stone-400">-</span>}</td>
          <td className="px-3 py-2"><div className="flex gap-2"><button onClick={() => { setError(""); setAvailable(i.isAvailable); setItem(i); }} className={btnSoft}>Atur</button>{i.trackStock ? <button onClick={() => { setError(""); setStockFor(i); }} className={btnSoft}>Stok</button> : null}</div></td>
        </tr>)}</tbody>
      </table>
      {!shown.length ? <p className="py-8 text-center text-stone-500">Tidak ada menu.</p> : null}
    </div>
    <Modal open={!!item} onClose={() => setItem(null)} title={item ? `Atur ${item.name}` : ""}>
      {item ? <form key={item.id} onSubmit={save} className="grid gap-3">
        <Field label={`Harga cabang (dasar ${rupiah(item.basePrice)})`}><input name="price" type="number" min={0} defaultValue={item.price ?? ""} className={input} placeholder="Kosong = ikut dasar" /></Field>
        <Field label={`HPP cabang (dasar ${rupiah(item.baseCost)})`}><input name="cost" type="number" min={0} defaultValue={item.cost ?? ""} className={input} placeholder="Kosong = ikut dasar" /></Field>
        <Field label="Stok minimum cabang"><input name="minStock" type="number" min={0} defaultValue={item.minStock ?? ""} className={input} placeholder="Kosong = ikut menu" /></Field>
        <Toggle checked={available} onChange={setAvailable} label="Dijual di cabang ini" />
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan</button>
      </form> : null}
    </Modal>
    <Modal open={!!stockFor} onClose={() => setStockFor(null)} title={stockFor ? `Stok ${stockFor.name}` : ""}>
      {stockFor ? <form key={stockFor.id} onSubmit={adjust} className="grid gap-3">
        <p className="text-sm text-stone-600">Stok sekarang {stockFor.stock}. Isi angka positif untuk menambah, negatif untuk mengurangi.</p>
        <Field label="Jumlah"><input name="quantity" type="number" required className={input} /></Field>
        <Field label="Alasan"><input name="reason" required minLength={2} className={input} placeholder="Stok awal, rusak, hitung ulang" /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan</button>
      </form> : null}
    </Modal>
  </div>;
}
