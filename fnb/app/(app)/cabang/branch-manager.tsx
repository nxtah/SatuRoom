"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSoft, call, Field, input, Modal } from "@/components/ui";
import type { Branch, BranchOverview } from "@/server/branches";

const STATUS: Record<string, string> = { menunggu: "Menunggu admin", disetujui: "Disetujui", ditolak: "Ditolak", dibatalkan: "Dibatalkan" };

export function BranchManager({ data }: { data: BranchOverview }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"" | "new" | "edit" | "request">("");
  const [edit, setEdit] = useState<Branch | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const full = data.used >= data.limit;
  const pending = data.requests.find((r) => r.status === "menunggu");

  async function submit(e: React.FormEvent<HTMLFormElement>, url: string, method: string, make: (f: FormData) => unknown) {
    e.preventDefault(); setBusy(true); setError("");
    const r = await call(url, method, make(new FormData(e.currentTarget)));
    setBusy(false);
    if (r.error) return setError(r.error);
    setDialog(""); router.refresh();
  }
  async function act(url: string, method = "DELETE") {
    setError("");
    const r = await call(url, method);
    if (r.error) setError(r.error); else router.refresh();
  }
  const open = (d: typeof dialog, b: Branch | null = null) => { setError(""); setEdit(b); setDialog(d); };

  return <div className="mt-5 grid gap-5">
    <section className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-kitchen p-5 text-white">
      <div><p className="text-sm text-white/70">Jatah cabang</p><p className="text-3xl font-extrabold tabular-nums">{data.used} <span className="text-lg text-white/70">dari {data.limit}</span></p></div>
      <div className="ml-auto flex flex-wrap gap-2">
        <button onClick={() => open("new")} disabled={full} className="inline-flex h-11 items-center rounded-full bg-saffron px-5 font-extrabold text-kitchen disabled:opacity-50">Tambah cabang</button>
        {full ? <button onClick={() => open("request")} disabled={!!pending} className="inline-flex h-11 items-center rounded-full bg-white/15 px-5 font-bold disabled:opacity-50">Ajukan cabang tambahan</button> : null}
      </div>
      {full ? <p className="basis-full text-sm text-white/70">{pending ? `Permintaan "${pending.name}" sedang diproses admin.` : "Jatah penuh. Ajukan cabang tambahan untuk menambah."}</p> : null}
    </section>
    {error && !dialog ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

    <section className="rounded-[2rem] bg-white p-5"><h2 className="text-xl font-extrabold">Daftar cabang</h2>
      <ul className="mt-2 grid gap-2">{data.branches.map((b) => <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-cream p-4">
        <div className="min-w-0 flex-1"><b>{b.name}</b>{b.isPrimary ? <span className="ml-2 rounded-full bg-saffron/40 px-2 py-0.5 text-xs font-bold">Utama</span> : null}<p className="text-sm text-stone-600">{b.address || "Alamat belum diisi"} · stok barang {b.itemStock.toLocaleString("id-ID")}</p></div>
        <Link href={`/cabang/barang?cabang=${b.id}`} className={btnSoft}>Barang cabang</Link>
        <button onClick={() => open("edit", b)} className={btnSoft}>Ubah</button>
        {!b.isPrimary ? <button onClick={() => { if (confirm(`Nonaktifkan cabang ${b.name}?`)) act(`/api/v1/branches/${b.id}`); }} className="text-sm font-bold text-chili">Nonaktifkan</button> : null}
      </li>)}</ul>
      <p className="mt-3 text-xs text-stone-500">Kasir saat ini mencatat penjualan di cabang utama. Harga dan stok per cabang dipakai kasir cabang itu setelah kasir multi-cabang tersedia; transfer stok sudah berjalan.</p>
    </section>

    {data.requests.length ? <section className="rounded-[2rem] bg-white p-5"><h2 className="text-xl font-extrabold">Permintaan cabang</h2>
      <ul className="mt-2 divide-y divide-stone-100 text-sm">{data.requests.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-3 py-2"><b>{r.name}</b><span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold">{STATUS[r.status] ?? r.status}</span>{r.note ? <span className="text-stone-500">{r.note}</span> : null}
        <span className="ml-auto text-xs text-stone-500">{new Date(r.at).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</span>
        {r.status === "menunggu" ? <button onClick={() => act(`/api/v1/branches/requests/${r.id}`)} className="text-xs font-bold text-chili">Batalkan</button> : null}</li>)}</ul></section> : null}

    <Modal open={dialog === "new" || dialog === "edit"} onClose={() => setDialog("")} title={dialog === "edit" ? "Ubah cabang" : "Tambah cabang"}>
      <form key={edit?.id ?? "new"} onSubmit={(e) => submit(e, edit ? `/api/v1/branches/${edit.id}` : "/api/v1/branches", edit ? "PUT" : "POST", (f) => ({ name: f.get("name"), address: f.get("address") }))} className="grid gap-3">
        <Field label="Nama cabang"><input name="name" required defaultValue={edit?.name} className={input} /></Field>
        <Field label="Alamat"><input name="address" defaultValue={edit?.address ?? ""} className={input} /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan</button>
      </form>
    </Modal>
    <Modal open={dialog === "request"} onClose={() => setDialog("")} title="Ajukan cabang tambahan">
      <form onSubmit={(e) => submit(e, "/api/v1/branches/requests", "POST", (f) => ({ name: f.get("name"), note: f.get("note") }))} className="grid gap-3">
        <p className="text-sm text-stone-600">Biaya per cabang tambahan disampaikan admin SatuRoom saat menghubungi Anda. Belum ada tagihan otomatis.</p>
        <Field label="Nama cabang yang diinginkan"><input name="name" required className={input} /></Field>
        <Field label="Catatan (opsional)"><input name="note" className={input} placeholder="Rencana buka, kota, dan lain-lain" /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Kirim permintaan</button>
      </form>
    </Modal>
  </div>;
}
