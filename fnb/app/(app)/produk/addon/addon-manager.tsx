"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageField } from "@/components/image-field";
import { btnAccent, btnPrimary, btnSoft, call, Field, input, Modal, rupiah } from "@/components/ui";
import { thumb } from "@/lib/images";
import type { ModifierGroup } from "@/server/modifiers";

type Opt = { id?: string; name: string; priceDelta: string; cost: string; sku: string; available: boolean; imageUrl: string | null; ingredientId: string; ingredientQty: string };
type Draft = { id?: string; name: string; description: string; minSelect: string; maxSelect: string; modifiers: Opt[] };
const blankOpt = (): Opt => ({ name: "", priceDelta: "0", cost: "0", sku: "", available: true, imageUrl: null, ingredientId: "", ingredientQty: "" });

export function AddonManager({ groups, items, ingredients, imagesReady }: { groups: ModifierGroup[]; items: { id: string; name: string }[]; ingredients: { id: string; name: string; unit: string }[]; imagesReady: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function open(g?: ModifierGroup) {
    setError("");
    setDraft(g ? { id: g.id, name: g.name, description: g.description ?? "", minSelect: String(g.minSelect), maxSelect: String(g.maxSelect), modifiers: g.modifiers.map((m) => ({ id: m.id, name: m.name, priceDelta: String(m.priceDelta), cost: String(m.cost), sku: m.sku ?? "", available: m.available, imageUrl: m.imageUrl, ingredientId: m.ingredientId ?? "", ingredientQty: m.ingredientQty ? String(m.ingredientQty) : "" })) } : { name: "", description: "", minSelect: "0", maxSelect: "1", modifiers: [blankOpt()] });
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    const body = {
      name: draft.name, description: draft.description || null, minSelect: Number(draft.minSelect), maxSelect: Number(draft.maxSelect),
      modifiers: draft.modifiers.map((m) => ({ id: m.id, name: m.name, priceDelta: Number(m.priceDelta) || 0, cost: Number(m.cost) || 0, sku: m.sku || null, available: m.available, imageUrl: m.imageUrl, ingredientId: m.ingredientId || null, ingredientQty: m.ingredientId ? Number(m.ingredientQty) || null : null })),
    };
    const res = draft.id ? await call(`/api/v1/modifier-groups/${draft.id}`, "PUT", body) : await call("/api/v1/modifier-groups", "POST", body);
    setBusy(false);
    if (res.error) return setError(res.error);
    setDraft(null); router.refresh();
  }
  async function archive(g: ModifierGroup) {
    if (!confirm(`Arsipkan grup ${g.name}? Menu yang memakainya tidak lagi menawarkan pilihan ini.`)) return;
    const res = await call(`/api/v1/modifier-groups/${g.id}`, "DELETE");
    if (res.error) return alert(res.error);
    router.refresh();
  }
  const setOpt = (i: number, patch: Partial<Opt>) => draft && setDraft({ ...draft, modifiers: draft.modifiers.map((m, k) => (k === i ? { ...m, ...patch } : m)) });

  return <>
    <div className="mt-6 flex justify-end"><button onClick={() => open()} className={btnAccent}><Plus aria-hidden className="size-5" />Tambah grup</button></div>
    <ul className="mt-4 grid gap-3 lg:grid-cols-2">
      {groups.map((g) => <li key={g.id} className="rounded-[1.6rem] bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1"><b className="text-lg">{g.name}</b><p className="text-sm text-stone-500">Pilih {g.minSelect === 0 ? "boleh kosong" : `minimal ${g.minSelect}`}, maksimal {g.maxSelect} · dipakai {g.itemIds.length} menu</p></div>
          <button onClick={() => open(g)} className={btnSoft}>Ubah</button>
          <button onClick={() => archive(g)} className="h-10 px-1 text-sm font-bold text-tomato">Arsipkan</button>
        </div>
        <ul className="mt-3 grid gap-1.5">{g.modifiers.map((m) => <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-2 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.imageUrl ? <img src={thumb(m.imageUrl, 64)!} alt="" className="size-8 rounded-lg object-cover" /> : null}
          <span className="flex-1 font-bold">{m.name}{!m.available ? <span className="ml-2 text-xs font-normal text-stone-500">habis</span> : null}</span>
          <span className="text-stone-600">{m.priceDelta ? `+${rupiah(m.priceDelta)}` : "Gratis"}</span>
          {m.ingredientId ? <span className="rounded-full bg-basil/10 px-2 py-0.5 text-xs font-bold text-basil">potong stok</span> : null}
        </li>)}</ul>
        {g.itemIds.length ? <p className="mt-3 text-xs text-stone-500">Dipasang di: {g.itemIds.map((id) => items.find((i) => i.id === id)?.name).filter(Boolean).slice(0, 6).join(", ")}{g.itemIds.length > 6 ? ` dan ${g.itemIds.length - 6} lainnya` : ""}</p> : <p className="mt-3 text-xs text-stone-500">Belum dipasang di menu mana pun. Pasang lewat Produk, Menu.</p>}
      </li>)}
      {!groups.length ? <li className="rounded-[1.6rem] bg-white p-8 text-center text-stone-500 lg:col-span-2">Belum ada grup. Contoh: Ukuran (Reguler, Besar), Topping (Boba, Jelly).</li> : null}
    </ul>
    <Modal wide open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Ubah grup pilihan" : "Grup pilihan baru"}>
      {draft ? <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama grup" className="sm:col-span-2"><input required maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={input} /></Field>
          <Field label="Keterangan (opsional)" className="sm:col-span-2"><input maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={input} /></Field>
          <Field label="Minimal dipilih" hint="0 = pelanggan boleh tidak memilih."><input type="number" min="0" max="20" value={draft.minSelect} onChange={(e) => setDraft({ ...draft, minSelect: e.target.value })} className={input} /></Field>
          <Field label="Maksimal dipilih"><input type="number" min="1" max="20" value={draft.maxSelect} onChange={(e) => setDraft({ ...draft, maxSelect: e.target.value })} className={input} /></Field>
        </div>
        <div className="grid gap-3">
          <p className="font-extrabold">Opsi</p>
          {draft.modifiers.map((m, i) => <div key={m.id ?? i} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
            <Field label="Nama opsi"><input required maxLength={60} value={m.name} onChange={(e) => setOpt(i, { name: e.target.value })} className={input} /></Field>
            <Field label="SKU (opsional)"><input maxLength={40} value={m.sku} onChange={(e) => setOpt(i, { sku: e.target.value })} className={input} /></Field>
            <Field label="Harga tambahan (Rp)"><input type="number" min="0" value={m.priceDelta} onChange={(e) => setOpt(i, { priceDelta: e.target.value })} className={input} /></Field>
            <Field label="HPP opsi (Rp)"><input type="number" min="0" value={m.cost} onChange={(e) => setOpt(i, { cost: e.target.value })} className={input} /></Field>
            <Field label="Potong bahan stok" hint="Opsi ini memakai bahan dari Inventaris."><select value={m.ingredientId} onChange={(e) => setOpt(i, { ingredientId: e.target.value })} className={input}><option value="">Tidak memotong stok</option>{ingredients.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.unit})</option>)}</select></Field>
            {m.ingredientId ? <Field label="Jumlah bahan per porsi"><input required type="number" step="0.001" min="0.001" value={m.ingredientQty} onChange={(e) => setOpt(i, { ingredientQty: e.target.value })} className={input} /></Field> : <span />}
            {imagesReady ? <div className="sm:col-span-2"><ImageField kind="addon" value={m.imageUrl} onChange={(imageUrl) => setOpt(i, { imageUrl })} label="Gambar opsi" /></div> : null}
            <div className="flex items-center justify-between sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={m.available} onChange={(e) => setOpt(i, { available: e.target.checked })} className="size-5 accent-basil" />Tersedia</label>
              {draft.modifiers.length > 1 ? <button type="button" onClick={() => setDraft({ ...draft, modifiers: draft.modifiers.filter((_, k) => k !== i) })} className="inline-flex items-center gap-1 text-sm font-bold text-tomato"><Trash2 aria-hidden className="size-4" />Hapus opsi</button> : null}
            </div>
          </div>)}
          <button type="button" onClick={() => setDraft({ ...draft, modifiers: [...draft.modifiers, blankOpt()] })} className={btnSoft}><Plus aria-hidden className="size-4" />Tambah opsi</button>
        </div>
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>{busy ? "Menyimpan..." : "Simpan grup"}</button>
      </form> : null}
    </Modal>
  </>;
}
