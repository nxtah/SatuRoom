"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnAccent, btnPrimary, btnSoft, call, Field, input, Modal, rupiah, Toggle } from "@/components/ui";
import type { Discount } from "@/server/discounts";

type Draft = {
  id?: string; name: string; kind: "percent" | "amount"; value: string; scope: "order" | "category" | "item"; categoryId: string; menuItemId: string; minSpend: string;
  days: number[]; startTime: string; endTime: string; startsOn: string; endsOn: string; orderTypeIds: string[]; autoApply: boolean; active: boolean;
};
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const blank: Draft = { name: "", kind: "percent", value: "", scope: "order", categoryId: "", menuItemId: "", minSpend: "0", days: [0, 1, 2, 3, 4, 5, 6], startTime: "", endTime: "", startsOn: "", endsOn: "", orderTypeIds: [], autoApply: false, active: true };

function summary(d: Discount, types: { id: string; name: string }[]) {
  const parts = [d.kind === "percent" ? `${d.value}%` : rupiah(d.value)];
  parts.push(d.scope === "order" ? "seluruh pesanan" : d.scope === "category" ? `kategori ${d.categoryName}` : `menu ${d.itemName}`);
  if (d.minSpend) parts.push(`min. belanja ${rupiah(d.minSpend)}`);
  if (d.days.length < 7) parts.push([...d.days].sort().map((x) => DAYS[x]).join(", "));
  if (d.startTime && d.endTime) parts.push(`${d.startTime}-${d.endTime}`);
  if (d.startsOn || d.endsOn) parts.push(`${d.startsOn ?? "..."} s/d ${d.endsOn ?? "..."}`);
  if (d.orderTypeIds.length) parts.push(d.orderTypeIds.map((id) => types.find((t) => t.id === id)?.name).filter(Boolean).join("/"));
  return parts.join(" · ");
}

export function DiscountPanel({ initial, categories, items, types }: { initial: Discount[]; categories: { id: string; name: string }[]; items: { id: string; name: string }[]; types: { id: string; name: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const body = (d: Draft) => ({
    name: d.name, kind: d.kind, value: Number(d.value), scope: d.scope, categoryId: d.scope === "category" ? d.categoryId || null : null, menuItemId: d.scope === "item" ? d.menuItemId || null : null,
    minSpend: Number(d.minSpend) || 0, days: d.days, startTime: d.startTime || null, endTime: d.endTime || null, startsOn: d.startsOn || null, endsOn: d.endsOn || null,
    orderTypeIds: d.orderTypeIds, autoApply: d.autoApply, active: d.active,
  });
  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    const res = draft.id ? await call(`/api/v1/discounts/${draft.id}`, "PUT", body(draft)) : await call("/api/v1/discounts", "POST", body(draft));
    setBusy(false);
    if (res.error) return setError(res.error);
    setDraft(null); router.refresh();
  }
  const toggle = async (d: Discount) => {
    await call(`/api/v1/discounts/${d.id}`, "PUT", { ...body(edit(d)), active: !d.active });
    router.refresh();
  };
  const edit = (d: Discount): Draft => ({ id: d.id, name: d.name, kind: d.kind, value: String(d.value), scope: d.scope, categoryId: d.categoryId ?? "", menuItemId: d.menuItemId ?? "", minSpend: String(d.minSpend), days: d.days, startTime: d.startTime ?? "", endTime: d.endTime ?? "", startsOn: d.startsOn ?? "", endsOn: d.endsOn ?? "", orderTypeIds: d.orderTypeIds, autoApply: d.autoApply, active: d.active });
  async function archive(d: Discount) {
    if (!confirm(`Arsipkan diskon ${d.name}? Pesanan lama tetap tercatat.`)) return;
    const res = await call(`/api/v1/discounts/${d.id}`, "DELETE");
    if (res.error) return alert(res.error);
    router.refresh();
  }
  const d = draft;
  const set = (patch: Partial<Draft>) => d && setDraft({ ...d, ...patch });
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return <section className="mt-6" aria-labelledby="diskon-judul">
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1"><h2 id="diskon-judul" className="text-2xl font-extrabold">Diskon</h2><p className="text-sm text-stone-600">Diskon bernama untuk seluruh pesanan, satu kategori, atau satu menu. Bisa dijadwalkan dan dipasang otomatis di kasir.</p></div>
      <button onClick={() => { setError(""); setDraft(blank); }} className={btnAccent}><Plus aria-hidden className="size-5" />Tambah diskon</button>
    </div>
    <ul className="mt-4 grid gap-3 lg:grid-cols-2">
      {initial.map((x) => <li key={x.id} className="rounded-[1.6rem] bg-white p-5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><b className="text-lg">{x.name}</b><p className="mt-0.5 text-sm text-stone-600">{summary(x, types)}</p></div>
          <div className="flex flex-col items-end gap-1">
            {x.autoApply ? <span className="rounded-full bg-saffron/30 px-2 py-0.5 text-xs font-bold">Otomatis</span> : null}
            <button onClick={() => toggle(x)} aria-pressed={x.active} className={`h-9 rounded-full px-3 text-xs font-bold ${x.active ? "bg-basil/10 text-basil" : "bg-stone-100 text-stone-500"}`}>{x.active ? "Aktif" : "Nonaktif"}</button>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-500">Dipakai {x.usedCount}x · total potongan {rupiah(x.givenTotal)}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => { setError(""); setDraft(edit(x)); }} className={btnSoft}>Ubah</button><button onClick={() => archive(x)} className="h-10 px-2 text-sm font-bold text-tomato">Arsipkan</button></div>
      </li>)}
      {!initial.length ? <li className="rounded-[1.6rem] bg-white p-8 text-center text-stone-500 lg:col-span-2">Belum ada diskon. Contoh: Happy Hour 20% setiap hari 14:00-17:00.</li> : null}
    </ul>
    <Modal wide open={!!d} onClose={() => setDraft(null)} title={d?.id ? "Ubah diskon" : "Diskon baru"}>
      {d ? <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama diskon" className="sm:col-span-2"><input required maxLength={60} value={d.name} onChange={(e) => set({ name: e.target.value })} className={input} /></Field>
          <Field label="Jenis"><select value={d.kind} onChange={(e) => set({ kind: e.target.value as Draft["kind"] })} className={input}><option value="percent">Persen (%)</option><option value="amount">Rupiah (Rp)</option></select></Field>
          <Field label={d.kind === "percent" ? "Besar diskon (%)" : "Besar diskon (Rp)"}><input required type="number" min="1" max={d.kind === "percent" ? 100 : 100000000} value={d.value} onChange={(e) => set({ value: e.target.value })} className={input} /></Field>
          <Field label="Berlaku untuk"><select value={d.scope} onChange={(e) => set({ scope: e.target.value as Draft["scope"] })} className={input}><option value="order">Seluruh pesanan</option><option value="category">Satu kategori</option><option value="item">Satu menu</option></select></Field>
          {d.scope === "category" ? <Field label="Kategori"><select required value={d.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={input}><option value="">Pilih kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field> : null}
          {d.scope === "item" ? <Field label="Menu"><select required value={d.menuItemId} onChange={(e) => set({ menuItemId: e.target.value })} className={input}><option value="">Pilih menu</option>{items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field> : null}
          <Field label="Minimal belanja (Rp)"><input type="number" min="0" value={d.minSpend} onChange={(e) => set({ minSpend: e.target.value })} className={input} /></Field>
        </div>
        <fieldset><legend className="font-extrabold">Jadwal</legend>
          <div className="mt-2 flex flex-wrap gap-2">{DAYS.map((n, i) => <button type="button" key={n} aria-pressed={d.days.includes(i)} onClick={() => set({ days: flip(d.days, i) })} className={`h-10 min-w-12 rounded-full px-3 text-sm font-bold ${d.days.includes(i) ? "bg-kitchen text-white" : "bg-white"}`}>{n}</button>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Jam mulai (opsional)"><input type="time" value={d.startTime} onChange={(e) => set({ startTime: e.target.value })} className={input} /></Field>
            <Field label="Jam selesai"><input type="time" value={d.endTime} onChange={(e) => set({ endTime: e.target.value })} className={input} /></Field>
            <Field label="Mulai tanggal (opsional)"><input type="date" value={d.startsOn} onChange={(e) => set({ startsOn: e.target.value })} className={input} /></Field>
            <Field label="Sampai tanggal"><input type="date" value={d.endsOn} onChange={(e) => set({ endsOn: e.target.value })} className={input} /></Field>
          </div>
        </fieldset>
        <fieldset><legend className="font-extrabold">Tipe pesanan</legend>
          <p className="text-sm text-stone-600">Kosongkan bila berlaku untuk semua tipe.</p>
          <div className="mt-2 flex flex-wrap gap-2">{types.map((t) => <button type="button" key={t.id} aria-pressed={d.orderTypeIds.includes(t.id)} onClick={() => set({ orderTypeIds: flip(d.orderTypeIds, t.id) })} className={`h-10 rounded-full px-4 text-sm font-bold ${d.orderTypeIds.includes(t.id) ? "bg-basil text-white" : "bg-white"}`}>{t.name}</button>)}</div>
        </fieldset>
        <Toggle checked={d.autoApply} onChange={(autoApply) => set({ autoApply })} label="Pasang otomatis di kasir" hint="Langsung terpasang bila syaratnya terpenuhi dan kasir tidak memilih diskon lain." />
        <Toggle checked={d.active} onChange={(active) => set({ active })} label="Aktif" />
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>{busy ? "Menyimpan..." : "Simpan diskon"}</button>
      </form> : null}
    </Modal>
  </section>;
}
