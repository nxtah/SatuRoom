"use client";

import { Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import { TableInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import { KIND_LABEL } from "@/lib/billing";
import type { TableRow } from "@/server/tables";

export function TableManager({ tables }: { tables: TableRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TableRow | "new" | null>(null);
  const [error, setError] = useState<string>();

  async function archive(t: TableRow) {
    if (!confirm(`Arsipkan ${t.name}? Riwayat sesinya tetap tersimpan.`)) return;
    const r = await api(`/tables/${t.id}`, { method: "DELETE" });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      {editing ? <TableForm key={typeof editing === "string" ? "new" : editing.id} table={editing === "new" ? undefined : editing} onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} /> : <Button className="mb-4" onClick={() => setEditing("new")}><Plus aria-hidden className="size-5" /> Tambah meja</Button>}
      <ul className="rise grid gap-2">
        {tables.map((t) => (
          <li key={t.id} className="tile flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-extrabold">{t.name}{t.isMaintenance ? <span className="inline-flex items-center gap-1 rounded-lg bg-mist px-2 py-0.5 text-xs"><Wrench aria-hidden className="size-3" /> Perawatan</span> : null}</p>
              <p className="tnum text-sm text-ink-soft">{KIND_LABEL[t.kind]} · {t.seats} kursi · {rupiah(t.ratePerHour)}/jam</p>
            </div>
            <button type="button" aria-label={`Ubah ${t.name}`} onClick={() => setEditing(t)} className="grid size-10 place-items-center rounded-lg hover:bg-mist"><Pencil aria-hidden className="size-4" /></button>
            <button type="button" aria-label={`Arsipkan ${t.name}`} onClick={() => archive(t)} className="grid size-10 place-items-center rounded-lg hover:bg-[#fdecec]"><Trash2 aria-hidden className="size-4" /></button>
          </li>
        ))}
      </ul>
    </>
  );
}

function TableForm({ table, onDone, onCancel }: { table?: TableRow; onDone: () => void; onCancel: () => void }) {
  const form = useForm(TableInput);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const done = await form.submit({ ...formValues(el), isMaintenance: (el.elements.namedItem("isMaintenance") as HTMLInputElement).checked }, (input) => (table ? api(`/tables/${table.id}`, { method: "PATCH", body: input }) : api("/tables", { body: input })));
    if (done) onDone();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="tile rise mb-5 grid gap-4 p-5" aria-label={table ? "Ubah meja" : "Tambah meja"}>
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama meja" name="name" defaultValue={table?.name} autoFocus placeholder="Meja 5" error={form.fields.name} />
        <div>
          <label htmlFor="kind" className="mb-2 block text-sm font-bold">Jenis</label>
          <select id="kind" name="kind" defaultValue={table?.kind ?? "auto"} className="h-13 w-full rounded-xl border-2 border-line bg-chalk px-3">
            {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Field label="Jumlah kursi" name="seats" inputMode="numeric" defaultValue={table?.seats ?? 4} error={form.fields.seats} />
        <Field label="Tarif per jam (Rp)" name="ratePerHour" inputMode="numeric" defaultValue={table?.ratePerHour ?? 40000} error={form.fields.ratePerHour} />
      </div>
      <label className="flex items-center gap-3 font-bold"><input type="checkbox" name="isMaintenance" defaultChecked={table?.isMaintenance} className="size-5 accent-[#0f3a2d]" /> Sedang perawatan (tidak bisa dibuka)</label>
      <div className="flex gap-3">
        <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan"}</Button>
        <Button variant="ghost" onClick={onCancel}>Batal</Button>
      </div>
    </form>
  );
}
