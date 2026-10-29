"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DiningTable } from "@/server/tables";

const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3";

export function TableManager({ tables }: { tables: DiningTable[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setError("");
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    setBusy(false);
    if (!res) { setError("Koneksi terputus. Coba lagi."); return false; }
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan."); return false; }
    router.refresh();
    return true;
  }
  const payload = () => ({ name, capacity: capacity ? Number(capacity) : null });

  return <section className="mt-4 rounded-[2rem] bg-white p-6">
    <h2 className="text-xl font-extrabold">Meja</h2>
    <p className="mt-1 text-sm text-stone-600">Meja muncul di kasir saat memilih Dine in. Satu meja hanya bisa punya satu pesanan aktif.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
      <input aria-label="Nama meja" className={field} placeholder="Nama meja, mis. Meja 1" value={name} onChange={(e) => setName(e.target.value)} />
      <input aria-label="Kapasitas" className={field} type="number" min="1" placeholder="Kursi" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      {editing
        ? <div className="flex gap-2"><button disabled={busy || !name.trim()} onClick={async () => { if (await call(`/api/v1/tables/${editing}`, "PUT", payload())) { setEditing(null); setName(""); setCapacity(""); } }} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan</button><button onClick={() => { setEditing(null); setName(""); setCapacity(""); }} className="h-11 rounded-full bg-stone-100 px-5 font-bold text-stone-600">Batal</button></div>
        : <button disabled={busy || !name.trim()} onClick={async () => { if (await call("/api/v1/tables", "POST", payload())) { setName(""); setCapacity(""); } }} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Tambah</button>}
    </div>
    <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {tables.map((t) => <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-stone-50 p-3">
        <b className="min-w-0 flex-1 truncate">{t.name}</b>
        <span className="text-xs text-stone-600">{t.capacity ? `${t.capacity} kursi` : "Kursi bebas"}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.order ? "bg-saffron/25 text-kitchen" : "bg-basil/10 text-basil"}`}>{t.order ? "Terpakai" : "Kosong"}</span>
        <button onClick={() => { setEditing(t.id); setName(t.name); setCapacity(t.capacity ? String(t.capacity) : ""); }} className="h-9 rounded-full bg-white px-4 text-sm font-bold text-stone-700">Ubah</button>
        <button disabled={busy || !!t.order} onClick={() => confirm(`Hapus ${t.name}?`) && call(`/api/v1/tables/${t.id}`, "DELETE")} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-40">Hapus</button>
      </li>)}
      {!tables.length ? <li className="rounded-2xl bg-stone-50 p-6 text-center text-stone-600 sm:col-span-2">Belum ada meja.</li> : null}
    </ul>
  </section>;
}
