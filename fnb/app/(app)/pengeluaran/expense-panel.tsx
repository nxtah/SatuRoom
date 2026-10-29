"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Expense } from "@/server/expenses";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3";

export function ExpensePanel({ initial, today }: { initial: Expense[]; today: string }) {
  const router = useRouter();
  const [v, setV] = useState({ amount: "", category: "", note: "", spentOn: today, fromDrawer: false });
  const [voidFor, setVoidFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, body: unknown) {
    setBusy(true); setError("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!res) { setError("Koneksi terputus. Coba lagi."); return false; }
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan."); return false; }
    router.refresh();
    return true;
  }
  const total = initial.filter((e) => !e.voidedAt).reduce((s, e) => s + e.amount, 0);

  return <div className="mt-6 grid gap-4">
    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Catat pengeluaran</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input aria-label="Nominal" className={field} type="number" min="1" placeholder="Nominal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
        <input aria-label="Kategori" className={field} placeholder="Kategori, mis. Listrik" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
        <input aria-label="Tanggal" className={field} type="date" max={today} value={v.spentOn} onChange={(e) => setV({ ...v, spentOn: e.target.value })} />
        <input aria-label="Catatan" className={field} placeholder="Catatan (opsional)" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-5 accent-kitchen" checked={v.fromDrawer} onChange={(e) => setV({ ...v, fromDrawer: e.target.checked })} />Dibayar dari uang laci (tercatat sebagai kas keluar)</label>
      <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
      <button disabled={busy || !v.amount || v.category.trim().length < 2} onClick={async () => { if (await call("/api/v1/expenses", { amount: Number(v.amount), category: v.category, note: v.note || null, spentOn: v.spentOn, fromDrawer: v.fromDrawer })) setV({ ...v, amount: "", category: "", note: "", fromDrawer: false }); }} className="mt-4 h-12 rounded-full bg-saffron px-8 font-extrabold text-kitchen disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan"}</button>
    </section>
    <section className="rounded-[2rem] bg-white p-6">
      <div className="flex items-baseline justify-between gap-2"><h2 className="text-xl font-extrabold">30 hari terakhir</h2><b className="tabular-nums">{rupiah(total)}</b></div>
      <ul className="mt-3 grid gap-2">
        {initial.map((e) => <li key={e.id} className="rounded-2xl border border-stone-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className={e.voidedAt ? "text-stone-400 line-through" : ""}>{e.category}</b>
            <span className="text-xs text-stone-600">{new Date(`${e.spentOn}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
            {e.fromDrawer ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">Dari laci</span> : null}
            <b className={`ml-auto tabular-nums ${e.voidedAt ? "text-stone-400 line-through" : ""}`}>{rupiah(e.amount)}</b>
            {!e.voidedAt ? <button onClick={() => { setVoidFor(e.id); setReason(""); }} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Batalkan</button> : <span className="text-xs font-bold text-red-700">dibatalkan</span>}
          </div>
          {e.note ? <p className="mt-1 text-sm text-stone-600">{e.note}</p> : null}
          {e.voidReason ? <p className="mt-1 text-xs text-stone-600">Alasan batal: {e.voidReason}</p> : null}
          {voidFor === e.id ? <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input aria-label="Alasan pembatalan" className={`${field} flex-1`} placeholder="Alasan pembatalan" value={reason} onChange={(x) => setReason(x.target.value)} />
            <button disabled={busy || reason.trim().length < 3} onClick={async () => { if (await call(`/api/v1/expenses/${e.id}/void`, { reason })) setVoidFor(null); }} className="h-11 rounded-full bg-tomato px-5 font-bold text-white disabled:opacity-40">Simpan</button>
          </div> : null}
        </li>)}
        {!initial.length ? <li className="py-8 text-center text-stone-600">Belum ada pengeluaran.</li> : null}
      </ul>
    </section>
  </div>;
}
