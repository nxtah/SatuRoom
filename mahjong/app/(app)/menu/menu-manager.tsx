"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import { MenuInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { MenuRow } from "@/server/menu";

const CATS = [["drink", "Minuman"], ["food", "Makanan"], ["snack", "Camilan"], ["other", "Lainnya"]] as const;

export function MenuManager({ items }: { items: MenuRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MenuRow | "new" | null>(null);
  const [error, setError] = useState<string>();

  async function patch(m: MenuRow, change: Partial<MenuRow>) {
    const r = await api(`/menu/${m.id}`, { method: "PATCH", body: { name: m.name, category: m.category, price: m.price, stock: m.stock, isAvailable: m.isAvailable, ...change } });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  async function archive(m: MenuRow) {
    if (!confirm(`Hapus ${m.name} dari menu?`)) return;
    const r = await api(`/menu/${m.id}`, { method: "DELETE" });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      {editing ? <MenuForm key={typeof editing === "string" ? "new" : editing.id} item={editing === "new" ? undefined : editing} onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} /> : (
        <Button className="mb-4" onClick={() => setEditing("new")}><Plus aria-hidden className="size-5" /> Tambah menu</Button>
      )}
      {items.length ? (
        CATS.map(([cat, label]) => {
          const rows = items.filter((i) => i.category === cat);
          if (!rows.length) return null;
          return (
            <section key={cat} className="rise mb-5" aria-label={label}>
              <h2 className="mb-2 text-sm font-extrabold text-ink-soft">{label}</h2>
              <ul className="grid gap-2">
                {rows.map((m) => (
                  <li key={m.id} className={`tile flex flex-wrap items-center gap-3 p-4 ${m.isAvailable ? "" : "opacity-60"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{m.name}</p>
                      <p className="tnum text-sm text-ink-soft">{rupiah(m.price)} · {m.stock === null ? "stok tidak dihitung" : m.stock === 0 ? "habis" : `sisa ${m.stock}`}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={m.isAvailable} onChange={(e) => patch(m, { isAvailable: e.target.checked })} className="size-5 accent-[#0f3a2d]" /> Tersedia
                    </label>
                    <button type="button" aria-label={`Ubah ${m.name}`} onClick={() => setEditing(m)} className="grid size-10 place-items-center rounded-lg hover:bg-mist"><Pencil aria-hidden className="size-4" /></button>
                    <button type="button" aria-label={`Hapus ${m.name}`} onClick={() => archive(m)} className="grid size-10 place-items-center rounded-lg hover:bg-[#fdecec]"><Trash2 aria-hidden className="size-4" /></button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      ) : editing ? null : (
        <EmptyState title="Menu masih kosong">Tambahkan teh, kopi, atau camilan supaya bisa dipesan dari meja.</EmptyState>
      )}
    </>
  );
}

function MenuForm({ item, onDone, onCancel }: { item?: MenuRow; onDone: () => void; onCancel: () => void }) {
  const form = useForm(MenuInput);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const done = await form.submit({ ...v, isAvailable: item?.isAvailable ?? true }, (input) => (item ? api(`/menu/${item.id}`, { method: "PATCH", body: input }) : api("/menu", { body: input })));
    if (done) onDone();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="tile rise mb-5 grid gap-4 p-5" aria-label={item ? "Ubah menu" : "Tambah menu"}>
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" name="name" defaultValue={item?.name} autoFocus placeholder="Teh tarik" error={form.fields.name} />
        <div>
          <label htmlFor="cat" className="mb-2 block text-sm font-bold">Kategori</label>
          <select id="cat" name="category" defaultValue={item?.category ?? "drink"} className="h-13 w-full rounded-xl border-2 border-line bg-chalk px-3">
            {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Field label="Harga (Rp)" name="price" inputMode="numeric" defaultValue={item?.price} error={form.fields.price} />
        <Field label="Stok (kosongkan bila tidak dihitung)" name="stock" inputMode="numeric" defaultValue={item?.stock ?? ""} error={form.fields.stock} />
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan"}</Button>
        <Button variant="ghost" onClick={onCancel}>Batal</Button>
      </div>
    </form>
  );
}
