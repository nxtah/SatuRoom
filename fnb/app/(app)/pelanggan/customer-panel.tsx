"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui";
import type { Customer, CustomerDetail } from "@/server/promos";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3";

export function CustomerPanel({ initial }: { initial: Customer[] }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", phone: "", notes: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [showing, setShowing] = useState(false);
  async function openDetail(id: string) {
    setDetail(null); setShowing(true);
    const res = await fetch(`/api/v1/customers/${id}`).catch(() => null);
    if (res?.ok) setDetail(await res.json()); else setShowing(false);
  }
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
          <button onClick={() => openDetail(c.id)} className="font-extrabold underline-offset-2 hover:underline">{c.name}</button>{c.phone ? <span className="text-sm text-stone-600">{c.phone}</span> : null}
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
    <Modal open={showing} onClose={() => setShowing(false)} title={detail?.name ?? "Pelanggan"}>
      {!detail ? <p className="py-8 text-center text-stone-500">Memuat...</p> : <div className="grid gap-4 text-sm">
        <p className="text-stone-600">{detail.phone ?? "Tanpa telepon"} · pelanggan sejak {new Date(detail.since).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</p>
        <dl className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-cream p-3"><dt className="text-xs text-stone-600">Belanja</dt><dd className="font-extrabold">{detail.orders}x</dd></div><div className="rounded-2xl bg-cream p-3"><dt className="text-xs text-stone-600">Total</dt><dd className="font-extrabold">{rupiah(detail.spent)}</dd></div><div className="rounded-2xl bg-cream p-3"><dt className="text-xs text-stone-600">Rata-rata</dt><dd className="font-extrabold">{rupiah(detail.avgTicket)}</dd></div></dl>
        {detail.notes ? <p className="rounded-2xl bg-saffron/20 p-3">{detail.notes}</p> : null}
        <section><h3 className="font-extrabold">Menu favorit</h3>{detail.favorites.length ? <ul className="mt-1 divide-y divide-stone-100">{detail.favorites.map((f) => <li key={f.name} className="flex justify-between py-1"><span>{f.name}</span><b>{f.quantity} porsi</b></li>)}</ul> : <p className="mt-1 text-stone-500">Belum ada pesanan.</p>}</section>
        <section><h3 className="font-extrabold">Transaksi terakhir</h3>{detail.recent.length ? <ul className="mt-1 divide-y divide-stone-100">{detail.recent.map((o) => <li key={o.id} className="flex items-center justify-between gap-2 py-1.5"><Link href={`/struk/${o.id}`} target="_blank" className="font-bold underline-offset-2 hover:underline">{o.receiptNo}</Link><span className="text-xs text-stone-500">{new Date(o.at).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}{o.status === "cancelled" ? " · batal" : ""}</span><b className="tabular-nums">{rupiah(o.total)}</b></li>)}</ul> : <p className="mt-1 text-stone-500">Belum ada transaksi.</p>}</section>
      </div>}
    </Modal>
  </div>;
}
