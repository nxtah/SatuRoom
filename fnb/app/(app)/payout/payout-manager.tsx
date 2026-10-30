"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSoft, call, Field, input, Modal, rupiah } from "@/components/ui";
import type { payoutOverview } from "@/server/payouts";

type Data = Awaited<ReturnType<typeof payoutOverview>>;
const METHOD: Record<string, string> = { transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };
const STATUS: Record<string, [string, string]> = { diajukan: ["Diajukan", "bg-saffron/30"], dicairkan: ["Sudah ditransfer", "bg-basil/10 text-basil"], dibatalkan: ["Dibatalkan", "bg-stone-200 text-stone-600"] };
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function PayoutManager({ data }: { data: Data }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"" | "account" | "request" | "paid" | "cancel">("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { balance: b } = data;

  async function submit(e: React.FormEvent<HTMLFormElement>, url: string, make: (f: FormData) => unknown) {
    e.preventDefault(); setBusy(true); setError("");
    const r = await call(url, "POST", make(new FormData(e.currentTarget)));
    setBusy(false);
    if (r.error) return setError(r.error);
    setDialog(""); router.refresh();
  }
  async function removeAccount(id: string) {
    const r = await call(`/api/v1/payouts/accounts/${id}`, "DELETE");
    if (r.error) setError(r.error); else router.refresh();
  }
  const open = (d: typeof dialog, id = "") => { setError(""); setTarget(id); setDialog(d); };

  return <div className="mt-5 grid gap-5">
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-[1.6rem] bg-kitchen p-5 text-white sm:col-span-1"><p className="text-sm text-white/70">Saldo bisa ditarik</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{rupiah(Math.max(0, b.available))}</p>
        <button onClick={() => open("request")} disabled={b.available < 10_000 || !data.accounts.length} className="mt-4 h-11 rounded-full bg-saffron px-5 font-extrabold text-kitchen disabled:opacity-50">Tarik saldo</button>
        {!data.accounts.length ? <p className="mt-2 text-xs text-white/70">Tambah rekening tujuan dulu.</p> : b.available < 10_000 ? <p className="mt-2 text-xs text-white/70">Minimal penarikan Rp10.000.</p> : null}</div>
      <div className="rounded-[1.6rem] bg-white p-5"><p className="text-sm text-stone-600">Non-tunai bersih</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{rupiah(b.netNonCash)}</p><p className="mt-1 text-xs text-stone-500">Diterima dikurangi refund non-tunai.</p></div>
      <div className="rounded-[1.6rem] bg-white p-5"><p className="text-sm text-stone-600">Sudah ditarik / menunggu</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{rupiah(b.paidOut)} <span className="text-base font-bold text-stone-500">/ {rupiah(b.pending)}</span></p></div>
    </section>

    {b.byMethod.length ? <section className="rounded-[2rem] bg-white p-5"><h2 className="text-xl font-extrabold">Asal saldo</h2>
      <ul className="mt-2 divide-y divide-stone-100">{b.byMethod.map((m) => <li key={m.method} className="flex flex-wrap gap-x-4 py-2 text-sm"><b className="w-24">{METHOD[m.method] ?? m.method}</b><span>Diterima {rupiah(m.received)}</span><span className="text-stone-500">Refund {rupiah(m.refunded)}</span><b className="ml-auto tabular-nums">{rupiah(m.net)}</b></li>)}</ul></section> : null}

    <section className="rounded-[2rem] bg-white p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Rekening tujuan</h2><button onClick={() => open("account")} className={btnSoft}>Tambah rekening</button></div>
      <ul className="mt-2 grid gap-2">{data.accounts.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream p-3 text-sm"><b>{a.bankName}</b><span>{a.accountNo}</span><span className="text-stone-600">a.n. {a.accountName}</span><button onClick={() => removeAccount(a.id)} className="ml-auto text-sm font-bold text-chili">Hapus</button></li>)}
        {!data.accounts.length ? <li className="py-4 text-center text-stone-500">Belum ada rekening.</li> : null}</ul>
    </section>

    <section className="rounded-[2rem] bg-white p-5"><h2 className="text-xl font-extrabold">Riwayat penarikan</h2>
      <ul className="mt-2 grid gap-2">{data.payouts.map((p) => <li key={p.id} className="rounded-2xl bg-cream p-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><b className="text-base tabular-nums">{rupiah(p.amount)}</b><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[p.status]![1]}`}>{STATUS[p.status]![0]}</span><span className="text-stone-600">{p.bankName} {p.accountNo}</span><span className="ml-auto text-xs text-stone-500">{when(p.requestedAt)}{p.requestedBy ? ` · ${p.requestedBy}` : ""}</span></div>
        {p.note ? <p className="mt-1 text-stone-600">{p.note}</p> : null}
        {p.reference ? <p className="mt-1 text-xs text-stone-600">Referensi {p.reference}{p.fee ? ` · biaya ${rupiah(p.fee)}` : ""}{p.paidAt ? ` · ${when(p.paidAt)}` : ""}</p> : null}
        {p.cancelReason ? <p className="mt-1 text-xs text-stone-600">Dibatalkan: {p.cancelReason}</p> : null}
        {p.status === "diajukan" ? <div className="mt-2 flex gap-2"><button onClick={() => open("paid", p.id)} className={btnPrimary}>Sudah saya transfer</button><button onClick={() => open("cancel", p.id)} className={btnSoft}>Batalkan</button></div> : null}
      </li>)}
        {!data.payouts.length ? <li className="py-4 text-center text-stone-500">Belum ada penarikan.</li> : null}</ul>
    </section>
    {error && !dialog ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

    <Modal open={dialog === "account"} onClose={() => setDialog("")} title="Tambah rekening">
      <form onSubmit={(e) => submit(e, "/api/v1/payouts/accounts", (f) => ({ bankName: f.get("bankName"), accountName: f.get("accountName"), accountNo: f.get("accountNo") }))} className="grid gap-3">
        <Field label="Bank atau e-wallet"><input name="bankName" required className={input} placeholder="BCA" /></Field>
        <Field label="Nama pemilik rekening"><input name="accountName" required className={input} /></Field>
        <Field label="Nomor rekening"><input name="accountNo" required inputMode="numeric" className={input} /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan</button>
      </form>
    </Modal>
    <Modal open={dialog === "request"} onClose={() => setDialog("")} title="Tarik saldo">
      <form onSubmit={(e) => submit(e, "/api/v1/payouts", (f) => ({ accountId: f.get("accountId"), amount: f.get("amount"), note: f.get("note") }))} className="grid gap-3">
        <Field label="Rekening tujuan"><select name="accountId" required className={input}>{data.accounts.map((a) => <option key={a.id} value={a.id}>{a.bankName} {a.accountNo} - {a.accountName}</option>)}</select></Field>
        <Field label={`Jumlah (maks ${rupiah(Math.max(0, b.available))})`}><input name="amount" type="number" min={10000} max={Math.max(0, b.available)} required className={input} /></Field>
        <Field label="Catatan (opsional)"><input name="note" className={input} /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Ajukan penarikan</button>
      </form>
    </Modal>
    <Modal open={dialog === "paid"} onClose={() => setDialog("")} title="Catat transfer selesai">
      <form onSubmit={(e) => submit(e, `/api/v1/payouts/${target}/paid`, (f) => ({ reference: f.get("reference"), fee: f.get("fee") || 0 }))} className="grid gap-3">
        <p className="text-sm text-stone-600">Isi setelah Anda benar-benar mentransfer dari rekening usaha. Rasa tidak mengirim uang.</p>
        <Field label="Nomor referensi transfer"><input name="reference" required className={input} /></Field>
        <Field label="Biaya transfer (opsional)"><input name="fee" type="number" min={0} className={input} /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan</button>
      </form>
    </Modal>
    <Modal open={dialog === "cancel"} onClose={() => setDialog("")} title="Batalkan penarikan">
      <form onSubmit={(e) => submit(e, `/api/v1/payouts/${target}/cancel`, (f) => ({ reason: f.get("reason") }))} className="grid gap-3">
        <Field label="Alasan"><input name="reason" required minLength={3} className={input} /></Field>
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Batalkan penarikan</button>
      </form>
    </Modal>
  </div>;
}
