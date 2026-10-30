"use client";
import { History, PackagePlus, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ImageField } from "@/components/image-field";
import { btnAccent, btnPrimary, btnSoft, call, Field, input, Modal, rupiah, Toggle } from "@/components/ui";
import { thumb } from "@/lib/images";
import type { Catalog, CatalogItem, PriceChange } from "@/server/catalog";

type Draft = {
  id?: string; name: string; description: string; categoryId: string; stationId: string; price: string; cost: string; sku: string; barcode: string;
  trackStock: boolean; minStock: string; openingStock: string; imageUrl: string | null; showInPos: boolean; taxable: boolean; groupIds: string[];
};
const blank = (categoryId: string): Draft => ({ name: "", description: "", categoryId, stationId: "", price: "", cost: "", sku: "", barcode: "", trackStock: false, minStock: "0", openingStock: "", imageUrl: null, showInPos: true, taxable: true, groupIds: [] });
const margin = (price: number, cost: number) => (price > 0 ? Math.round(((price - cost) / price) * 100) : 0);
const FILTERS = [["all", "Semua"], ["ready", "Tersedia"], ["out", "Habis"], ["low", "Stok menipis"], ["hidden", "Tidak di kasir"]] as const;

export function MenuManager({ initial, imagesReady }: { initial: Catalog; imagesReady: boolean }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stockFor, setStockFor] = useState<CatalogItem | null>(null);
  const [stockForm, setStockForm] = useState({ quantity: "", reason: "" });
  const [history, setHistory] = useState<{ item: CatalogItem; rows: PriceChange[] } | null>(null);
  const [station, setStation] = useState("");

  const reload = async () => { setData(await (await fetch("/api/v1/catalog")).json()); router.refresh(); };
  const items = useMemo(() => data.items.filter((i) => {
    const text = `${i.name} ${i.sku ?? ""} ${i.barcode ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (cat !== "all" && i.categoryId !== cat) return false;
    if (filter === "ready") return i.available;
    if (filter === "out") return !i.available;
    if (filter === "low") return i.trackStock && i.stock <= i.minStock;
    if (filter === "hidden") return !i.showInPos;
    return true;
  }), [data.items, q, cat, filter]);

  function open(i?: CatalogItem) {
    setError("");
    setDraft(i ? { id: i.id, name: i.name, description: i.description ?? "", categoryId: i.categoryId, stationId: i.stationId ?? "", price: String(i.price), cost: String(i.cost), sku: i.sku ?? "", barcode: i.barcode ?? "", trackStock: i.trackStock, minStock: String(i.minStock), openingStock: "", imageUrl: i.imageUrl, showInPos: i.showInPos, taxable: i.taxable, groupIds: i.groupIds } : blank(data.categories[0]?.id ?? ""));
  }

  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    const body = { name: draft.name, description: draft.description || undefined, categoryId: draft.categoryId, stationId: draft.stationId || null, price: Number(draft.price), cost: Number(draft.cost) || 0, sku: draft.sku || null, barcode: draft.barcode || null, trackStock: draft.trackStock, minStock: Number(draft.minStock) || 0, imageUrl: draft.imageUrl, showInPos: draft.showInPos, taxable: draft.taxable };
    let id = draft.id;
    let res = draft.id ? await call(`/api/v1/catalog/items/${draft.id}`, "PUT", { ...body, description: draft.description || null }) : await call("/api/v1/catalog", "POST", { type: "item", ...body });
    if (!res.error && !id) id = (res.data as { id: string }).id;
    if (!res.error && id) res = await call(`/api/v1/catalog/items/${id}/groups`, "PUT", { groupIds: draft.groupIds });
    if (!res.error && !draft.id && draft.trackStock && Number(draft.openingStock) > 0) res = await call(`/api/v1/catalog/items/${id}/stock`, "POST", { quantity: Number(draft.openingStock), reason: "Stok awal" });
    setBusy(false);
    if (res.error) return setError(res.error);
    setDraft(null); await reload();
  }
  async function archive(i: CatalogItem) {
    if (!confirm(`Arsipkan ${i.name}? Menu hilang dari kasir, riwayat pesanan tetap utuh.`)) return;
    const res = await call(`/api/v1/catalog/items/${i.id}`, "DELETE");
    if (res.error) return alert(res.error);
    await reload();
  }
  async function toggle(i: CatalogItem) {
    await call(`/api/v1/catalog/items/${i.id}/availability`, "PATCH", { available: !i.available });
    await reload();
  }
  async function saveStock() {
    if (!stockFor) return;
    setBusy(true); setError("");
    const res = await call(`/api/v1/catalog/items/${stockFor.id}/stock`, "POST", { quantity: Number(stockForm.quantity), reason: stockForm.reason });
    setBusy(false);
    if (res.error) return setError(res.error);
    setStockFor(null); setStockForm({ quantity: "", reason: "" }); await reload();
  }
  async function showHistory(i: CatalogItem) {
    const res = await fetch(`/api/v1/catalog/items/${i.id}/prices`).catch(() => null);
    setHistory({ item: i, rows: res?.ok ? await res.json() : [] });
  }
  async function addStation() {
    const res = await call("/api/v1/catalog", "POST", { type: "station", name: station });
    if (res.error) return alert(res.error);
    setStation(""); await reload();
  }

  const d = draft;
  const price = Number(d?.price) || 0;
  const cost = Number(d?.cost) || 0;
  return <>
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1"><Search aria-hidden className="absolute top-3 left-3 size-5 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, SKU, atau barcode" aria-label="Cari menu" className={`${input} pl-10`} /></div>
      <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter kategori" className="h-11 rounded-xl border border-stone-300 bg-white px-3"><option value="all">Semua kategori</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button onClick={() => open()} disabled={!data.categories.length} className={btnAccent}><Plus aria-hidden className="size-5" />Tambah menu</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter status">
      {FILTERS.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={`h-10 rounded-full px-4 text-sm font-bold ${filter === k ? "bg-kitchen text-white" : "bg-white"}`}>{label}</button>)}
    </div>
    {!data.categories.length ? <p className="mt-4 rounded-2xl bg-cream p-4 font-bold">Buat kategori dulu di menu Produk, Kategori.</p> : null}

    <ul className="mt-4 grid gap-2">
      {items.map((i) => {
        const low = i.trackStock && i.stock <= i.minStock;
        return <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-[1.6rem] bg-white p-3 sm:p-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cream text-xl font-extrabold text-kitchen/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.imageUrl ? <img src={thumb(i.imageUrl, 128)!} alt="" className="size-full object-cover" /> : i.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 basis-48">
            <b className="block truncate">{i.name}</b>
            <p className="text-sm text-stone-500">{i.categoryName}{i.sku ? ` · ${i.sku}` : ""}{i.stationName ? ` · ${i.stationName}` : ""}</p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
              {!i.showInPos ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-500">Tidak di kasir</span> : null}
              {!i.taxable ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-500">Bebas pajak</span> : null}
              {i.groupIds.length ? <span className="rounded-full bg-basil/10 px-2 py-0.5 text-basil">{i.groupIds.length} add-on</span> : null}
              {i.trackStock ? <span className={`rounded-full px-2 py-0.5 ${low ? "bg-tomato/15 text-chili" : "bg-basil/10 text-basil"}`}>Stok {i.stock}{low ? " (menipis)" : ""}</span> : null}
            </div>
          </div>
          <div className="text-right text-sm"><b className="block text-base">{rupiah(i.price)}</b><span className="text-stone-500">HPP {rupiah(i.cost)} · laba {margin(i.price, i.cost)}%</span></div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => toggle(i)} aria-pressed={i.available} className={`h-10 rounded-full px-3 text-xs font-bold ${i.available ? "bg-basil/10 text-basil" : "bg-stone-100 text-stone-500"}`}>{i.available ? "Tersedia" : "Habis"}</button>
            <button onClick={() => open(i)} className={btnSoft}>Ubah</button>
            {i.trackStock ? <button onClick={() => { setError(""); setStockFor(i); }} aria-label={`Atur stok ${i.name}`} className={btnSoft}><PackagePlus aria-hidden className="size-4" />Stok</button> : null}
            <button onClick={() => showHistory(i)} aria-label={`Riwayat harga ${i.name}`} className={btnSoft}><History aria-hidden className="size-4" /></button>
            <button onClick={() => archive(i)} className="h-10 px-2 text-sm font-bold text-tomato">Arsipkan</button>
          </div>
        </li>;
      })}
      {!items.length ? <li className="rounded-[1.6rem] bg-white p-8 text-center text-stone-500">{data.items.length ? "Tidak ada menu yang cocok dengan filter." : "Belum ada menu. Tambahkan menu pertama Anda."}</li> : null}
    </ul>

    <section className="mt-6 rounded-[2rem] bg-white p-5">
      <h2 className="text-lg font-extrabold">Station dapur</h2>
      <p className="mt-1 text-sm text-stone-600">Tentukan menu dikerjakan di bagian mana (Dapur, Bar, Pastry). Layar dapur bisa disaring per station.</p>
      <div className="mt-3 flex flex-wrap gap-2">{data.stations.map((s) => <span key={s.id} className="rounded-full bg-basil/10 px-3 py-1 text-sm font-bold text-basil">{s.name}</span>)}{!data.stations.length ? <span className="text-stone-500">Belum ada station.</span> : null}</div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void addStation(); }}><input value={station} onChange={(e) => setStation(e.target.value)} required maxLength={60} placeholder="Nama station baru" aria-label="Nama station baru" className={input} /><button className={btnPrimary}>Tambah</button></form>
    </section>

    <Modal wide open={!!d} onClose={() => setDraft(null)} title={d?.id ? "Ubah menu" : "Menu baru"}>
      {d ? <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-1 font-extrabold">Informasi dasar</legend>
          <Field label="Nama menu" className="sm:col-span-2"><input required maxLength={100} value={d.name} onChange={(e) => setDraft({ ...d, name: e.target.value })} className={input} /></Field>
          <Field label="Kategori"><select required value={d.categoryId} onChange={(e) => setDraft({ ...d, categoryId: e.target.value })} className={input}>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Station dapur"><select value={d.stationId} onChange={(e) => setDraft({ ...d, stationId: e.target.value })} className={input}><option value="">Tanpa station</option>{data.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Deskripsi (opsional)" className="sm:col-span-2"><textarea maxLength={300} rows={2} value={d.description} onChange={(e) => setDraft({ ...d, description: e.target.value })} className="w-full rounded-xl border border-stone-300 bg-white p-3" /></Field>
          <div className="sm:col-span-2">{imagesReady ? <ImageField kind="menu" value={d.imageUrl} onChange={(imageUrl) => setDraft({ ...d, imageUrl })} label="Foto menu" /> : <p className="rounded-2xl bg-cream p-3 text-sm">Upload foto aktif setelah kunci Cloudinary diisi admin.</p>}</div>
        </fieldset>
        <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-1 font-extrabold">Harga</legend>
          <Field label="Harga jual (Rp)"><input required type="number" min="0" max="100000000" value={d.price} onChange={(e) => setDraft({ ...d, price: e.target.value })} className={input} /></Field>
          <Field label="Harga pokok / HPP (Rp)" hint="Modal per porsi, dipakai untuk laba di laporan."><input type="number" min="0" max="100000000" value={d.cost} onChange={(e) => setDraft({ ...d, cost: e.target.value })} className={input} /></Field>
          <p className="rounded-2xl bg-basil/10 p-3 text-sm font-bold text-basil sm:col-span-2">Laba kotor per porsi {rupiah(price - cost)} ({margin(price, cost)}%)</p>
          <div className="sm:col-span-2"><Toggle checked={d.taxable} onChange={(taxable) => setDraft({ ...d, taxable })} label="Kena pajak" hint="Matikan untuk menu yang tidak dikenai pajak restoran." /></div>
        </fieldset>
        <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-1 font-extrabold">Kode barang</legend>
          <Field label="SKU" hint="Kode internal unik, contoh ES-KOPI-01."><input maxLength={40} value={d.sku} onChange={(e) => setDraft({ ...d, sku: e.target.value })} className={input} /></Field>
          <Field label="Barcode" hint="Untuk scanner kasir."><input maxLength={40} value={d.barcode} onChange={(e) => setDraft({ ...d, barcode: e.target.value })} className={input} /></Field>
        </fieldset>
        <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-1 font-extrabold">Stok</legend>
          <div className="sm:col-span-2"><Toggle checked={d.trackStock} onChange={(trackStock) => setDraft({ ...d, trackStock })} label="Lacak stok barang jadi" hint="Untuk barang yang dijual utuh (air mineral, roti kemasan). Menu racikan cukup atur resep di Inventaris." /></div>
          {d.trackStock ? <>
            <Field label="Stok minimal" hint="Muncul peringatan bila stok sampai angka ini."><input type="number" min="0" value={d.minStock} onChange={(e) => setDraft({ ...d, minStock: e.target.value })} className={input} /></Field>
            {!d.id ? <Field label="Stok awal"><input type="number" min="0" value={d.openingStock} onChange={(e) => setDraft({ ...d, openingStock: e.target.value })} className={input} /></Field> : null}
          </> : null}
        </fieldset>
        <fieldset className="grid gap-3"><legend className="mb-1 font-extrabold">Tampil dan pilihan</legend>
          <Toggle checked={d.showInPos} onChange={(showInPos) => setDraft({ ...d, showInPos })} label="Tampil di kasir" hint="Matikan untuk menu musiman atau bahan penunjang." />
          {data.groups.length ? <div><p className="text-sm font-bold">Add-on dan varian</p><div className="mt-2 flex flex-wrap gap-2">{data.groups.map((g) => { const on = d.groupIds.includes(g.id); return <button type="button" key={g.id} aria-pressed={on} onClick={() => setDraft({ ...d, groupIds: on ? d.groupIds.filter((x) => x !== g.id) : [...d.groupIds, g.id] })} className={`h-10 rounded-full px-4 text-sm font-bold ${on ? "bg-basil text-white" : "bg-white"}`}>{g.name}</button>; })}</div></div> : <p className="text-sm text-stone-500">Belum ada grup add-on. Buat di Produk, Add-on dan varian.</p>}
        </fieldset>
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>{busy ? "Menyimpan..." : "Simpan menu"}</button>
      </form> : null}
    </Modal>

    <Modal open={!!stockFor} onClose={() => setStockFor(null)} title={`Atur stok ${stockFor?.name ?? ""}`}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveStock(); }}>
        <p className="rounded-2xl bg-cream p-3 text-sm">Stok sekarang <b>{stockFor?.stock}</b>. Isi angka positif untuk menambah, negatif untuk mengurangi.</p>
        <Field label="Jumlah (+/-)"><input required type="number" step="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} className={input} /></Field>
        <Field label="Alasan"><input required minLength={2} maxLength={120} placeholder="Barang masuk, rusak, hasil hitung..." value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} className={input} /></Field>
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan stok</button>
      </form>
    </Modal>

    <Modal open={!!history} onClose={() => setHistory(null)} title={`Riwayat harga ${history?.item.name ?? ""}`}>
      {history?.rows.length ? <ul className="grid gap-2">{history.rows.map((r) => <li key={r.changedAt} className="rounded-2xl bg-white p-3 text-sm"><b>{rupiah(r.oldPrice)} → {rupiah(r.newPrice)}</b><p className="text-stone-500">{new Date(r.changedAt).toLocaleString("id-ID")}{r.by ? ` · ${r.by}` : ""}</p></li>)}</ul> : <p className="text-stone-500">Harga belum pernah diubah.</p>}
    </Modal>
  </>;
}
