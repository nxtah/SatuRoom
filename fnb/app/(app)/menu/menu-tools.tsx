"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Catalog, PriceChange } from "@/server/catalog";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const field = "h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3";
const chip = "inline-flex h-11 items-center rounded-full bg-stone-100 px-4 text-sm font-bold";

async function call(url: string, method: string, payload?: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload) }).catch(() => null);
  if (!res) return "Koneksi terputus. Coba lagi.";
  return res.ok ? null : ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan.";
}

/** Ubah, arsipkan, dan atur varian/add-on untuk setiap menu. */
export function ItemEditor({ catalog, canManage }: { catalog: Catalog; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "", price: "", categoryId: "", stationId: "" });
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [history, setHistory] = useState<PriceChange[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function edit(i: Catalog["items"][number]) {
    setOpen(i.id); setError("");
    setDraft({ name: i.name, description: i.description ?? "", price: String(i.price), categoryId: i.categoryId, stationId: i.stationId ?? "" });
    setGroupIds(i.groupIds); setHistory([]);
    const res = await fetch(`/api/v1/catalog/items/${i.id}/prices`).catch(() => null);
    if (res?.ok) setHistory(await res.json());
  }

  async function save(id: string) {
    setBusy(true); setError("");
    const e1 = await call(`/api/v1/catalog/items/${id}`, "PUT", { name: draft.name, description: draft.description || null, price: Number(draft.price), categoryId: draft.categoryId, stationId: draft.stationId || null });
    const e2 = e1 ?? (await call(`/api/v1/catalog/items/${id}/groups`, "PUT", { groupIds }));
    setBusy(false);
    if (e2) return setError(e2);
    setOpen(null); router.refresh();
  }

  async function archive(i: Catalog["items"][number]) {
    if (!confirm(`Arsipkan ${i.name}? Menu hilang dari kasir, riwayat pesanan tetap utuh.`)) return;
    setBusy(true);
    const err = await call(`/api/v1/catalog/items/${i.id}`, "DELETE");
    setBusy(false);
    if (err) return setError(err);
    setOpen(null); router.refresh();
  }

  return <section className="rounded-[2rem] bg-white p-5">
    <h2 className="text-xl font-extrabold">Ubah menu</h2>
    <p className="mt-1 text-sm text-stone-600">Ganti nama, harga, kategori, atau pasang varian dan add-on. Perubahan harga tercatat dan tidak mengubah pesanan lama.</p>
    <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
    <ul className="mt-3 grid gap-2">
      {catalog.items.map((i) => <li key={i.id} className="rounded-2xl bg-stone-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1"><b className="block truncate">{i.name}</b><span className="text-sm text-stone-600">{i.categoryName} · {rupiah(i.price)}{i.groupIds.length ? ` · ${i.groupIds.length} grup pilihan` : ""}</span></span>
          {canManage && open !== i.id ? <button onClick={() => edit(i)} className={chip}>Ubah</button> : null}
        </div>
        {open === i.id ? <div className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input aria-label="Nama menu" className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input aria-label="Harga" type="number" min="0" className={field} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            <select aria-label="Kategori" className={field} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>{catalog.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select aria-label="Station dapur" className={field} value={draft.stationId} onChange={(e) => setDraft({ ...draft, stationId: e.target.value })}><option value="">Tanpa station</option>{catalog.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input aria-label="Deskripsi" className={`${field} sm:col-span-2`} placeholder="Deskripsi (opsional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          {catalog.groups.length ? <fieldset><legend className="text-sm font-extrabold">Varian dan add-on</legend><div className="mt-2 flex flex-wrap gap-2">{catalog.groups.map((g) => <label key={g.id} className={`${chip} cursor-pointer ${groupIds.includes(g.id) ? "bg-saffron text-kitchen" : ""}`}><input type="checkbox" className="sr-only" checked={groupIds.includes(g.id)} onChange={() => setGroupIds(groupIds.includes(g.id) ? groupIds.filter((x) => x !== g.id) : [...groupIds, g.id])} />{g.name}</label>)}</div></fieldset> : null}
          {history.length ? <div><p className="text-sm font-extrabold">Riwayat harga</p><ul className="mt-1 text-sm text-stone-600">{history.map((h, n) => <li key={n}>{new Date(h.changedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}: {rupiah(h.oldPrice)} ke {rupiah(h.newPrice)}{h.by ? `, oleh ${h.by}` : ""}</li>)}</ul></div> : null}
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !draft.name.trim() || draft.price === ""} onClick={() => save(i.id)} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan</button>
            <button onClick={() => setOpen(null)} className={chip}>Batal</button>
            <button disabled={busy} onClick={() => archive(i)} className={`${chip} ml-auto text-red-700`}>Arsipkan</button>
          </div>
        </div> : null}
      </li>)}
      {!catalog.items.length ? <li className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">Belum ada menu.</li> : null}
    </ul>
  </section>;
}

type Draft = { id?: string; name: string; minSelect: number; maxSelect: number; modifiers: { id?: string; name: string; priceDelta: number; available: boolean }[] };
const blank = (): Draft => ({ name: "", minSelect: 0, maxSelect: 1, modifiers: [{ name: "", priceDelta: 0, available: true }] });

/** Grup pilihan seperti Ukuran, Level gula, atau Topping, dengan aturan minimal dan maksimal pilihan. */
export function GroupManager({ groups, canManage }: { groups: Catalog["groups"]; canManage: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setMod = (n: number, patch: Partial<Draft["modifiers"][number]>) => setDraft((d) => d && { ...d, modifiers: d.modifiers.map((m, k) => (k === n ? { ...m, ...patch } : m)) });

  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    const err = await call(draft.id ? `/api/v1/modifier-groups/${draft.id}` : "/api/v1/modifier-groups", draft.id ? "PUT" : "POST", draft);
    setBusy(false);
    if (err) return setError(err);
    setDraft(null); router.refresh();
  }
  async function remove(g: Catalog["groups"][number]) {
    if (!confirm(`Arsipkan grup ${g.name}? Grup dilepas dari semua menu.`)) return;
    const err = await call(`/api/v1/modifier-groups/${g.id}`, "DELETE");
    if (err) return setError(err);
    router.refresh();
  }

  return <section className="rounded-[2rem] bg-white p-5">
    <h2 className="text-xl font-extrabold">Varian dan add-on</h2>
    <p className="mt-1 text-sm text-stone-600">Buat grup pilihan sekali, lalu pasang ke menu mana saja lewat Ubah menu.</p>
    <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
    {canManage && !draft ? <button onClick={() => setDraft(blank())} className="mt-3 h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen">+ Grup baru</button> : null}
    {draft ? <div className="mt-3 grid gap-3 rounded-2xl bg-stone-50 p-4">
      <input aria-label="Nama grup" className={field} placeholder="Contoh: Ukuran" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-bold">Minimal pilih<input type="number" min="0" className={field} value={draft.minSelect} onChange={(e) => setDraft({ ...draft, minSelect: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-sm font-bold">Maksimal pilih<input type="number" min="1" className={field} value={draft.maxSelect} onChange={(e) => setDraft({ ...draft, maxSelect: Number(e.target.value) })} /></label>
      </div>
      <p className="text-xs text-stone-600">Minimal 1 dan maksimal 1 berarti pelanggan wajib memilih satu (misal Ukuran). Minimal 0 berarti opsional.</p>
      {draft.modifiers.map((m, n) => <div key={n} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
        <input aria-label={`Nama opsi ${n + 1}`} className={field} placeholder="Nama opsi" value={m.name} onChange={(e) => setMod(n, { name: e.target.value })} />
        <input aria-label={`Tambahan harga opsi ${n + 1}`} type="number" min="0" className={field} placeholder="+Rp" value={m.priceDelta} onChange={(e) => setMod(n, { priceDelta: Number(e.target.value) })} />
        {draft.modifiers.length > 1 ? <button onClick={() => setDraft({ ...draft, modifiers: draft.modifiers.filter((_, k) => k !== n) })} className={chip}>Hapus</button> : <span />}
        <label className="col-span-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={m.available} onChange={(e) => setMod(n, { available: e.target.checked })} className="size-5" />Tersedia</label>
      </div>)}
      <button onClick={() => setDraft({ ...draft, modifiers: [...draft.modifiers, { name: "", priceDelta: 0, available: true }] })} className={`${chip} w-fit`}>+ Opsi</button>
      <div className="flex gap-2">
        <button disabled={busy || !draft.name.trim() || draft.modifiers.some((m) => !m.name.trim())} onClick={save} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan grup</button>
        <button onClick={() => setDraft(null)} className={chip}>Batal</button>
      </div>
    </div> : null}
    <ul className="mt-3 grid gap-2">
      {groups.map((g) => <li key={g.id} className="rounded-2xl bg-stone-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1"><b className="block truncate">{g.name}</b><span className="text-sm text-stone-600">Pilih {g.minSelect === g.maxSelect ? g.minSelect : `${g.minSelect}–${g.maxSelect}`} · dipakai {g.itemIds.length} menu</span></span>
          {canManage ? <><button onClick={() => setDraft({ id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, modifiers: g.modifiers.map((m) => ({ ...m })) })} className={chip}>Ubah</button><button onClick={() => remove(g)} className={`${chip} text-red-700`}>Arsipkan</button></> : null}
        </div>
        <p className="mt-2 text-sm text-stone-600">{g.modifiers.map((m) => `${m.name}${m.priceDelta ? ` +${rupiah(m.priceDelta)}` : ""}${m.available ? "" : " (habis)"}`).join(" · ")}</p>
      </li>)}
      {!groups.length ? <li className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">Belum ada grup pilihan.</li> : null}
    </ul>
  </section>;
}
