"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StockData } from "@/server/stock";

const num = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3 tabular-nums placeholder:text-stone-500";
const chip = "h-10 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700 hover:bg-stone-200";

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { ok: res.ok, error: (data as { error?: string }).error };
}

export function StockPanel({ initial, canManage }: { initial: StockData; canManage: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", openingStock: "", minimumStock: "", averageCost: "" });
  const [adjustFor, setAdjustFor] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [recipeFor, setRecipeFor] = useState<string | null>(null);
  const [lines, setLines] = useState<{ ingredientId: string; quantity: string }[]>([]);

  async function run(job: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    setBusy(true); setError(""); setMessage("");
    const r = await job();
    if (r.ok) { setMessage(done); after?.(); router.refresh(); } else setError(r.error ?? "Gagal menyimpan.");
    setBusy(false);
  }

  const addIngredient = () => run(
    () => send("/api/v1/stock/ingredients", "POST", {
      name: form.name, unit: form.unit,
      openingStock: Number(form.openingStock || 0), minimumStock: Number(form.minimumStock || 0), averageCost: Number(form.averageCost || 0),
    }),
    "Bahan ditambahkan.", () => setForm({ name: "", unit: "", openingStock: "", minimumStock: "", averageCost: "" }),
  );

  const adjust = (id: string, sign: 1 | -1) => run(
    () => send(`/api/v1/stock/ingredients/${id}/adjust`, "POST", { quantity: sign * Number(delta || 0), reason }),
    "Stok diperbarui.", () => { setAdjustFor(null); setDelta(""); setReason(""); },
  );

  const saveRecipe = (menuItemId: string) => run(
    () => send("/api/v1/stock/recipes", "PUT", {
      menuItemId, lines: lines.filter((l) => l.ingredientId && Number(l.quantity) > 0).map((l) => ({ ingredientId: l.ingredientId, quantity: Number(l.quantity) })),
    }),
    "Resep disimpan.", () => setRecipeFor(null),
  );

  const low = initial.ingredients.filter((i) => i.low);

  return <div className="mt-6 grid gap-4">
    <div aria-live="polite" className="grid gap-4 empty:hidden">
      {message ? <p className="rounded-2xl bg-basil/10 p-4 text-sm font-bold text-basil">{message}</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    </div>
    {low.length ? <p className="rounded-2xl bg-saffron/20 p-4 text-sm font-bold text-kitchen">Hampir habis: {low.map((i) => i.name).join(", ")}.</p> : null}

    {canManage ? <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Tambah bahan</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input className={field} aria-label="Nama bahan" placeholder="Nama, mis. Beras" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} aria-label="Satuan" placeholder="Satuan, mis. kg" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <input className={field} type="number" min="0" step="any" aria-label="Stok awal" placeholder="Stok awal" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} />
        <input className={field} type="number" min="0" step="any" aria-label="Batas minimum" placeholder="Batas minimum" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
        <input className={field} type="number" min="0" aria-label="Harga per satuan" placeholder="Harga/satuan (Rp)" value={form.averageCost} onChange={(e) => setForm({ ...form, averageCost: e.target.value })} />
      </div>
      <button onClick={addIngredient} disabled={busy || !form.name || !form.unit} className="mt-3 h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan bahan</button>
    </section> : null}

    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Daftar bahan</h2>
      <div className="mt-3 divide-y divide-stone-200">
        {initial.ingredients.map((i) => <div key={i.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <b>{i.name}</b>
            {i.low ? <span className="rounded-full bg-saffron/25 px-2.5 py-0.5 text-xs font-bold text-kitchen">Hampir habis</span> : null}
            <span className="ml-auto font-extrabold tabular-nums">{num(i.stock)} {i.unit}</span>
            {canManage ? <button onClick={() => { setAdjustFor(adjustFor === i.id ? null : i.id); setDelta(""); setReason(""); }} className={chip}>Ubah stok</button> : null}
          </div>
          <p className="mt-0.5 text-xs text-stone-600">Minimum {num(i.minimum)} {i.unit}</p>
          {adjustFor === i.id ? <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr_auto_auto]">
            <input className={field} type="number" min="0" step="any" aria-label="Jumlah" placeholder="Jumlah" value={delta} onChange={(e) => setDelta(e.target.value)} />
            <input className={field} aria-label="Alasan" placeholder="Alasan, mis. Belanja pasar" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button onClick={() => adjust(i.id, 1)} disabled={busy || !Number(delta)} className="h-11 rounded-full bg-basil px-4 text-sm font-bold text-white disabled:opacity-40">Tambah</button>
            <button onClick={() => adjust(i.id, -1)} disabled={busy || !Number(delta)} className="h-11 rounded-full bg-tomato px-4 text-sm font-bold text-white disabled:opacity-40">Kurangi</button>
          </div> : null}
        </div>)}
        {!initial.ingredients.length ? <p className="py-10 text-center text-stone-500">Belum ada bahan baku.</p> : null}
      </div>
    </section>

    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Resep menu</h2>
      <p className="mt-1 text-sm text-stone-500">Isi bahan per porsi agar stok terpotong otomatis saat menu terjual.</p>
      <div className="mt-3 divide-y divide-stone-200">
        {initial.items.map((item) => <div key={item.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <b>{item.name}</b>
            <span className="w-full text-xs text-stone-600 sm:w-auto">{item.lines.length ? item.lines.map((l) => `${num(l.quantity)} ${l.unit} ${l.name}`).join(", ") : "Belum ada resep"}</span>
            {canManage && initial.ingredients.length ? <button onClick={() => {
              if (recipeFor === item.id) { setRecipeFor(null); return; }
              setRecipeFor(item.id);
              setLines(item.lines.length ? item.lines.map((l) => ({ ingredientId: l.ingredientId, quantity: String(l.quantity) })) : [{ ingredientId: "", quantity: "" }]);
            }} className={`${chip} ml-auto`}>Atur resep</button> : null}
          </div>
          {recipeFor === item.id ? <div className="mt-2 grid gap-2">
            {lines.map((l, idx) => <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
              <select aria-label="Bahan" className={field} value={l.ingredientId} onChange={(e) => setLines(lines.map((x, k) => (k === idx ? { ...x, ingredientId: e.target.value } : x)))}>
                <option value="">Pilih bahan</option>
                {initial.ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
              <input className={field} type="number" min="0" step="any" aria-label="Jumlah per porsi" placeholder="Per porsi" value={l.quantity} onChange={(e) => setLines(lines.map((x, k) => (k === idx ? { ...x, quantity: e.target.value } : x)))} />
              <button onClick={() => setLines(lines.filter((_, k) => k !== idx))} className={chip}>Hapus</button>
            </div>)}
            <div className="flex gap-2">
              <button onClick={() => setLines([...lines, { ingredientId: "", quantity: "" }])} className={chip}>+ Bahan</button>
              <button onClick={() => saveRecipe(item.id)} disabled={busy} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan resep</button>
            </div>
          </div> : null}
        </div>)}
        {!initial.items.length ? <p className="py-6 text-center text-stone-500">Belum ada menu. Tambahkan di halaman Menu.</p> : null}
      </div>
    </section>

    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="font-extrabold">Pergerakan terakhir</h2>
      <div className="mt-3 grid gap-1">
        {initial.movements.map((m) => <div key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
          <b>{m.ingredientName}</b>
          <span className={m.quantity > 0 ? "font-bold text-basil" : "font-bold text-tomato"}>{m.quantity > 0 ? "+" : ""}{num(m.quantity)} {m.unit}</span>
          <span className="text-stone-600">{m.reason}</span>
          <span className="ml-auto text-xs text-stone-500">{new Date(m.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
        </div>)}
        {!initial.movements.length ? <p className="py-6 text-center text-stone-500">Belum ada pergerakan stok.</p> : null}
      </div>
    </section>
  </div>;
}
