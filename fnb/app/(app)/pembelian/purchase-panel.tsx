"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseRow, Supplier } from "@/server/purchases";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const num = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3 tabular-nums placeholder:text-stone-500";
const chip = "h-10 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700 hover:bg-stone-200";

async function send(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: (data as { error?: string }).error };
}

type Line = { ingredientId: string; quantity: string; unitCost: string };
const emptyLine = (): Line => ({ ingredientId: "", quantity: "", unitCost: "" });

export function PurchasePanel({ suppliers, purchases, ingredients, canManage }: {
  suppliers: Supplier[]; purchases: PurchaseRow[]; ingredients: { id: string; name: string; unit: string }[]; canManage: boolean;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = lines.filter((l) => l.ingredientId && Number(l.quantity) > 0);
  const total = valid.reduce((a, l) => a + Number(l.quantity) * Number(l.unitCost || 0), 0);
  const patch = (idx: number, p: Partial<Line>) => setLines(lines.map((l, k) => (k === idx ? { ...l, ...p } : l)));

  async function run(job: () => Promise<{ ok: boolean; error?: string }>, done: string, after: () => void) {
    setBusy(true); setError(""); setMessage("");
    const r = await job();
    if (r.ok) { setMessage(done); after(); router.refresh(); } else setError(r.error ?? "Gagal menyimpan.");
    setBusy(false);
  }

  const save = () => run(() => send("/api/v1/purchases", {
    supplierId: supplierId || null, notes: notes || undefined,
    lines: valid.map((l) => ({ ingredientId: l.ingredientId, quantity: Number(l.quantity), unitCost: Number(l.unitCost || 0) })),
  }), "Pembelian dicatat. Stok sudah bertambah.", () => { setLines([emptyLine()]); setNotes(""); });

  const addSupplier = () => run(() => send("/api/v1/suppliers", { name: newSupplier.name, phone: newSupplier.phone }),
    "Supplier ditambahkan.", () => setNewSupplier({ name: "", phone: "" }));

  return <div className="mt-6 grid gap-4">
    <div aria-live="polite" className="grid gap-4 empty:hidden">
      {message ? <p className="rounded-2xl bg-basil/10 p-4 text-sm font-bold text-basil">{message}</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    </div>

    {canManage ? <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Catat belanja</h2>
      {ingredients.length === 0 ? <p className="mt-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">Belum ada bahan. Tambahkan bahan dulu di halaman Stok.</p> : <>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <select aria-label="Supplier" className={field} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Tanpa supplier (beli di pasar)</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input aria-label="Catatan" className={field} placeholder="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="mt-3 grid gap-2">
          {lines.map((l, idx) => <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_7rem_9rem_auto]">
            <select aria-label="Bahan" className={field} value={l.ingredientId} onChange={(e) => patch(idx, { ingredientId: e.target.value })}>
              <option value="">Pilih bahan</option>
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
            <input aria-label="Jumlah dibeli" className={field} type="number" min="0" step="any" placeholder="Jumlah" value={l.quantity} onChange={(e) => patch(idx, { quantity: e.target.value })} />
            <input aria-label="Harga per satuan" className={field} type="number" min="0" placeholder="Harga/satuan (Rp)" value={l.unitCost} onChange={(e) => patch(idx, { unitCost: e.target.value })} />
            {lines.length > 1 ? <button onClick={() => setLines(lines.filter((_, k) => k !== idx))} className={chip}>Hapus</button> : <span />}
          </div>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={() => setLines([...lines, emptyLine()])} className={chip}>+ Bahan</button>
          <span className="ml-auto font-extrabold tabular-nums">Total {rupiah(Math.round(total))}</span>
          <button onClick={save} disabled={busy || valid.length === 0} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan pembelian</button>
        </div>
      </>}
    </section> : null}

    {canManage ? <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Supplier</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {suppliers.map((s) => <span key={s.id} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-bold">{s.name}{s.phone ? `, ${s.phone}` : ""}</span>)}
        {!suppliers.length ? <p className="text-sm text-stone-600">Belum ada supplier.</p> : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
        <input aria-label="Nama supplier" className={field} placeholder="Nama supplier" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
        <input aria-label="Nomor HP supplier" className={field} placeholder="No. HP (opsional)" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
        <button onClick={addSupplier} disabled={busy || !newSupplier.name} className={`${chip} disabled:opacity-40`}>Tambah</button>
      </div>
    </section> : null}

    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Riwayat pembelian</h2>
      <div className="mt-3 divide-y divide-stone-200">
        {purchases.map((p) => <div key={p.id} className="py-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <b>{p.supplierName ?? "Tanpa supplier"}</b>
            <span className="text-xs text-stone-600">{p.createdAt.replace("T", " ")}</span>
            <b className="ml-auto tabular-nums">{rupiah(p.total)}</b>
          </div>
          <p className="mt-0.5 text-sm text-stone-600">{p.lines.map((l) => `${num(l.quantity)} ${l.unit} ${l.name}`).join(", ")}</p>
          {p.notes ? <p className="text-xs text-stone-600">{p.notes}</p> : null}
        </div>)}
        {!purchases.length ? <p className="py-8 text-center text-stone-600">Belum ada pembelian.</p> : null}
      </div>
    </section>
  </div>;
}
