"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSoft, call, Field, input, Modal } from "@/components/ui";
import type { Transfer } from "@/server/transfers";

const STATUS: Record<string, [string, string]> = { draft: ["Draft", "bg-stone-100"], dikirim: ["Dalam perjalanan", "bg-saffron/30"], diterima: ["Diterima", "bg-basil/10 text-basil"], dibatalkan: ["Dibatalkan", "bg-stone-200 text-stone-600"] };

export function TransferManager({ branches, items, transfers }: { branches: { id: string; name: string }[]; items: { id: string; name: string }[]; transfers: Transfer[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"" | "new" | "receive">("");
  const [target, setTarget] = useState<Transfer | null>(null);
  const [lines, setLines] = useState<{ menuItemId: string; quantity: number }[]>([{ menuItemId: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await call("/api/v1/transfers", "POST", { fromOutletId: f.get("from"), toOutletId: f.get("to"), note: f.get("note"), lines: lines.filter((l) => l.menuItemId) });
    setBusy(false);
    if (r.error) return setError(r.error);
    setDialog(""); setLines([{ menuItemId: "", quantity: 1 }]); router.refresh();
  }
  async function act(id: string, action: "send" | "cancel") {
    setError("");
    const r = await call(`/api/v1/transfers/${id}/${action}`, "POST");
    if (r.error) setError(r.error); else router.refresh();
  }
  async function receive(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await call(`/api/v1/transfers/${target!.id}/receive`, "POST", { lines: target!.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: Number(f.get(l.menuItemId)) })) });
    setBusy(false);
    if (r.error) return setError(r.error);
    setDialog(""); router.refresh();
  }
  return <div className="mt-5 grid gap-4">
    <div className="flex justify-end"><button onClick={() => { setError(""); setDialog("new"); }} disabled={branches.length < 2 || !items.length} className={btnPrimary}>Buat transfer</button></div>
    {branches.length < 2 ? <p className="rounded-2xl bg-saffron/20 p-3 text-sm font-bold">Transfer butuh minimal dua cabang. Tambah cabang di menu Cabang.</p> : !items.length ? <p className="rounded-2xl bg-saffron/20 p-3 text-sm font-bold">Belum ada menu dengan lacak stok. Aktifkan di menu Produk lebih dulu.</p> : null}
    {error && !dialog ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
    <ul className="grid gap-3">{transfers.map((t) => <li key={t.id} className="rounded-[1.6rem] bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><b>{t.number}</b><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[t.status]![1]}`}>{STATUS[t.status]![0]}</span><span className="text-sm text-stone-600">{t.fromName} ke {t.toName}</span><span className="ml-auto text-xs text-stone-500">{new Date(t.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</span></div>
      <ul className="mt-2 divide-y divide-stone-100 text-sm">{t.lines.map((l) => <li key={l.menuItemId} className="flex justify-between py-1"><span>{l.name}{l.sku ? ` · ${l.sku}` : ""}</span><b className="tabular-nums">{l.quantity}{l.receivedQuantity !== null && l.receivedQuantity !== l.quantity ? <span className="font-normal text-chili"> (diterima {l.receivedQuantity})</span> : null}</b></li>)}</ul>
      {t.note ? <p className="mt-1 text-xs text-stone-500">{t.note}</p> : null}
      <div className="mt-2 flex gap-2">
        {t.status === "draft" ? <button onClick={() => act(t.id, "send")} className={btnPrimary}>Kirim</button> : null}
        {t.status === "dikirim" ? <button onClick={() => { setError(""); setTarget(t); setDialog("receive"); }} className={btnPrimary}>Terima barang</button> : null}
        {t.status === "draft" || t.status === "dikirim" ? <button onClick={() => act(t.id, "cancel")} className={btnSoft}>Batalkan</button> : null}
      </div>
    </li>)}
      {!transfers.length ? <li className="rounded-[2rem] bg-white p-10 text-center text-stone-500">Belum ada transfer.</li> : null}</ul>

    <Modal wide open={dialog === "new"} onClose={() => setDialog("")} title="Buat transfer stok">
      <form onSubmit={create} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dari cabang"><select name="from" required className={input}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Ke cabang"><select name="to" required defaultValue={branches[1]?.id} className={input}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        </div>
        <div className="grid gap-2">{lines.map((l, i) => <div key={i} className="flex gap-2">
          <select aria-label="Barang" value={l.menuItemId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, menuItemId: e.target.value } : x)))} className={input}><option value="">Pilih barang</option>{items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}</select>
          <input aria-label="Jumlah" type="number" min={1} value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} className={`${input} max-w-28`} />
          {lines.length > 1 ? <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="px-2 text-sm font-bold text-chili">Hapus</button> : null}
        </div>)}
          <button type="button" onClick={() => setLines([...lines, { menuItemId: "", quantity: 1 }])} className={`${btnSoft} justify-self-start`}>Tambah barang</button></div>
        <Field label="Catatan (opsional)"><input name="note" className={input} /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan sebagai draft</button>
      </form>
    </Modal>
    <Modal open={dialog === "receive"} onClose={() => setDialog("")} title={target ? `Terima ${target.number}` : ""}>
      {target ? <form key={target.id} onSubmit={receive} className="grid gap-3">
        <p className="text-sm text-stone-600">Isi jumlah yang benar-benar sampai. Kekurangan tercatat sebagai selisih.</p>
        {target.lines.map((l) => <Field key={l.menuItemId} label={`${l.name} (dikirim ${l.quantity})`}><input name={l.menuItemId} type="number" min={0} max={l.quantity} defaultValue={l.quantity} className={input} /></Field>)}
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Konfirmasi diterima</button>
      </form> : null}
    </Modal>
  </div>;
}
