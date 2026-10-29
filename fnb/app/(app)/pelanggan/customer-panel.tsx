"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Customer } from "@/server/promos";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3";

export function CustomerPanel({ initial }: { initial: Customer[] }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", phone: "", notes: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reset = () => { setEditing(null); setV({ name: "", phone: "", notes: "" }); };

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setError("");
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    setBusy(false);
    if (!res) { setError("Koneksi terputus. Coba lagi."); return false; }
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan."); return false; }
    router.refresh();
    return true;
  }
  const payload = () => ({ name: v.name, phone: v.phone || null, notes: v.notes || null });

  return <div className="mt-6 grid gap-4">
    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">{editing ? "Ubah pelanggan" : "Tambah pelanggan"}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input aria-label="Nama" className={field} placeholder="Nama" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <input aria-label="Telepon" className={field} inputMode="tel" placeholder="Telepon, mis. 081234567890" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        <input aria-label="Catatan" className={`${field} sm:col-span-2`} placeholder="Catatan, mis. alergi kacang" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </div>
      <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
      <div className="mt-4 flex gap-2">
        <button disabled={busy || !v.name.trim()} onClick={async () => { if (await (editing ? call(`/api/v1/customers/${editing}`, "PUT", payload()) : call("/api/v1/customers", "POST", payload()))) reset(); }} className="h-12 rounded-full bg-saffron px-8 font-extrabold text-kitchen disabled:opacity-40">{editing ? "Simpan" : "Tambah"}</button>
        {editing ? <button onClick={reset} className="h-12 rounded-full bg-stone-100 px-6 font-bold text-stone-600">Batal</button> : null}
      </div>
    </section>
    <ul className="grid gap-2">
      {initial.map((c) => <li key={c.id} className="rounded-[1.5rem] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <b>{c.name}</b>{c.phone ? <span className="text-sm text-stone-600">{c.phone}</span> : null}
          <span className="ml-auto text-sm text-stone-600">{c.orders}x belanja · <b className="text-ink">{rupiah(c.spent)}</b></span>
        </div>
        {c.notes ? <p className="mt-1 text-sm text-stone-600">{c.notes}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {c.lastVisit ? <span className="text-xs text-stone-600">Terakhir {new Date(c.lastVisit).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}</span> : null}
          <button onClick={() => { setEditing(c.id); setV({ name: c.name, phone: c.phone ?? "", notes: c.notes ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="ml-auto h-9 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700">Ubah</button>
          <button disabled={busy} onClick={() => confirm(`Hapus ${c.name}? Riwayat pesanan tetap tersimpan.`) && call(`/api/v1/customers/${c.id}`, "DELETE")} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700">Hapus</button>
        </div>
      </li>)}
      {!initial.length ? <li className="rounded-[2rem] bg-white p-10 text-center text-stone-600">Belum ada pelanggan.</li> : null}
    </ul>
  </div>;
}
