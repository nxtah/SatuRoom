"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnAccent, btnPrimary, btnSoft, call, Field, input, Modal, Toggle } from "@/components/ui";
import type { OrderType } from "@/server/order-types";

type Draft = { id?: string; name: string; kind: OrderType["kind"]; servicePercent: string; taxPercent: string; requireTable: boolean; isActive: boolean; sortOrder: string };
const KIND = { dine_in: "Makan di tempat", takeaway: "Dibawa pulang", pickup: "Diambil sendiri" } as const;
const blank: Draft = { name: "", kind: "takeaway", servicePercent: "", taxPercent: "", requireTable: false, isActive: true, sortOrder: "10" };

export function OrderTypeManager({ initial, baseService, baseTax }: { initial: OrderType[]; baseService: number; baseTax: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const d = draft;
  const set = (patch: Partial<Draft>) => d && setDraft({ ...d, ...patch });

  async function save() {
    if (!d) return;
    setBusy(true); setError("");
    const body = { name: d.name, kind: d.kind, servicePercent: d.servicePercent === "" ? null : Number(d.servicePercent), taxPercent: d.taxPercent === "" ? null : Number(d.taxPercent), requireTable: d.requireTable, isActive: d.isActive, sortOrder: Number(d.sortOrder) || 0 };
    const res = d.id ? await call(`/api/v1/order-types/${d.id}`, "PUT", body) : await call("/api/v1/order-types", "POST", body);
    setBusy(false);
    if (res.error) return setError(res.error);
    setDraft(null); router.refresh();
  }
  async function archive(t: OrderType) {
    if (!confirm(`Arsipkan tipe ${t.name}? Pesanan lama tetap menyimpan namanya.`)) return;
    const res = await call(`/api/v1/order-types/${t.id}`, "DELETE");
    if (res.error) return alert(res.error);
    router.refresh();
  }
  const rate = (v: number | null, base: number) => (v === null ? `ikut umum (${base}%)` : `${v}%`);

  return <>
    <div className="mt-6 flex justify-end"><button onClick={() => { setError(""); setDraft(blank); }} className={btnAccent}><Plus aria-hidden className="size-5" />Tambah tipe</button></div>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {initial.map((t) => <li key={t.id} className="rounded-[1.6rem] bg-white p-5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><b className="text-lg">{t.name}</b><p className="text-sm text-stone-500">{KIND[t.kind]}{t.requireTable ? " · wajib pilih meja" : ""}</p></div>
          {!t.isActive ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-500">Nonaktif</span> : null}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-2xl bg-stone-50 p-3"><dt className="text-stone-500">Service charge</dt><dd className="font-bold">{rate(t.servicePercent, baseService)}</dd></div><div className="rounded-2xl bg-stone-50 p-3"><dt className="text-stone-500">Pajak</dt><dd className="font-bold">{rate(t.taxPercent, baseTax)}</dd></div></dl>
        <p className="mt-3 text-sm text-stone-500">Dipakai di {t.usedCount} pesanan</p>
        <div className="mt-3 flex gap-2"><button onClick={() => { setError(""); setDraft({ id: t.id, name: t.name, kind: t.kind, servicePercent: t.servicePercent === null ? "" : String(t.servicePercent), taxPercent: t.taxPercent === null ? "" : String(t.taxPercent), requireTable: t.requireTable, isActive: t.isActive, sortOrder: String(t.sortOrder) }); }} className={btnSoft}>Ubah</button><button onClick={() => archive(t)} className="h-10 px-2 text-sm font-bold text-tomato">Arsipkan</button></div>
      </li>)}
    </ul>
    <Modal open={!!d} onClose={() => setDraft(null)} title={d?.id ? "Ubah tipe pesanan" : "Tipe pesanan baru"}>
      {d ? <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nama tipe"><input required maxLength={40} value={d.name} onChange={(e) => set({ name: e.target.value })} className={input} /></Field>
        <Field label="Jenis dasar" hint="Menentukan perilaku di dapur dan laporan."><select value={d.kind} onChange={(e) => set({ kind: e.target.value as Draft["kind"] })} className={input}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Service charge (%)" hint={`Kosong = ikut umum (${baseService}%).`}><input type="number" min="0" max="100" step="0.5" value={d.servicePercent} onChange={(e) => set({ servicePercent: e.target.value })} className={input} /></Field>
          <Field label="Pajak (%)" hint={`Kosong = ikut umum (${baseTax}%).`}><input type="number" min="0" max="100" step="0.5" value={d.taxPercent} onChange={(e) => set({ taxPercent: e.target.value })} className={input} /></Field>
        </div>
        <Field label="Urutan tampil"><input type="number" min="0" value={d.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} className={input} /></Field>
        <Toggle checked={d.requireTable} onChange={(requireTable) => set({ requireTable })} label="Wajib pilih meja" />
        <Toggle checked={d.isActive} onChange={(isActive) => set({ isActive })} label="Aktif di kasir" />
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>{busy ? "Menyimpan..." : "Simpan tipe"}</button>
      </form> : null}
    </Modal>
  </>;
}
