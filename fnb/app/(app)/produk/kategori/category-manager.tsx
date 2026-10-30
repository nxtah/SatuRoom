"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageField } from "@/components/image-field";
import { btnAccent, btnPrimary, btnSoft, call, Field, input, Modal, Toggle } from "@/components/ui";
import { thumb } from "@/lib/images";
import type { CatalogCategory } from "@/server/catalog";

type Draft = { id?: string; name: string; description: string; imageUrl: string | null; isActive: boolean; sortOrder: string };
const blank: Draft = { name: "", description: "", imageUrl: null, isActive: true, sortOrder: "0" };

export function CategoryManager({ initial, imagesReady }: { initial: CatalogCategory[]; imagesReady: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    const body = { name: draft.name, description: draft.description || null, imageUrl: draft.imageUrl, isActive: draft.isActive, sortOrder: Number(draft.sortOrder) || 0 };
    const res = draft.id ? await call(`/api/v1/catalog/categories/${draft.id}`, "PUT", body) : await call("/api/v1/catalog", "POST", { type: "category", name: body.name, description: body.description, imageUrl: body.imageUrl });
    setBusy(false);
    if (res.error) return setError(res.error);
    setDraft(null); router.refresh();
  }
  async function archive(c: CatalogCategory) {
    if (!confirm(`Arsipkan kategori ${c.name}?`)) return;
    const res = await call(`/api/v1/catalog/categories/${c.id}`, "DELETE");
    if (res.error) return alert(res.error);
    router.refresh();
  }

  return <>
    <div className="mt-6 flex justify-end"><button onClick={() => { setError(""); setDraft(blank); }} className={btnAccent}><Plus aria-hidden className="size-5" />Tambah kategori</button></div>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {initial.map((c) => <li key={c.id} className="flex items-center gap-3 rounded-[1.6rem] bg-white p-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cream text-2xl font-extrabold text-kitchen/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.imageUrl ? <img src={thumb(c.imageUrl, 128)!} alt="" className="size-full object-cover" /> : c.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <b className="block truncate">{c.name}</b>
          <p className="text-sm text-stone-500">{c.itemCount} menu · urutan {c.sortOrder}</p>
          {!c.isActive ? <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-500">Nonaktif</span> : null}
        </div>
        <div className="grid gap-1">
          <button onClick={() => { setError(""); setDraft({ id: c.id, name: c.name, description: c.description ?? "", imageUrl: c.imageUrl, isActive: c.isActive, sortOrder: String(c.sortOrder) }); }} className={btnSoft}>Ubah</button>
          <button onClick={() => archive(c)} className="h-8 text-sm font-bold text-tomato">Arsipkan</button>
        </div>
      </li>)}
      {!initial.length ? <li className="rounded-[1.6rem] bg-white p-8 text-center text-stone-500 sm:col-span-2 lg:col-span-3">Belum ada kategori. Mulai dengan Makanan, Minuman, atau Camilan.</li> : null}
    </ul>
    <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Ubah kategori" : "Kategori baru"}>
      {draft ? <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nama kategori"><input required maxLength={100} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={input} /></Field>
        <Field label="Keterangan (opsional)"><input maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={input} /></Field>
        <Field label="Urutan tampil" hint="Angka kecil tampil lebih dulu."><input type="number" min="0" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} className={input} /></Field>
        {imagesReady ? <ImageField kind="kategori" value={draft.imageUrl} onChange={(imageUrl) => setDraft({ ...draft, imageUrl })} /> : <p className="rounded-2xl bg-cream p-3 text-sm">Upload gambar aktif setelah kunci Cloudinary diisi admin.</p>}
        <Toggle checked={draft.isActive} onChange={(isActive) => setDraft({ ...draft, isActive })} label="Tampil di kasir" hint="Matikan untuk menyembunyikan seluruh menu di kategori ini." />
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>{busy ? "Menyimpan..." : "Simpan kategori"}</button>
      </form> : null}
    </Modal>
  </>;
}
