"use client";

import { Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { monthLabel, rupiah } from "@/lib/money";
import { ExpenseInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { AccountRow, AccountType, AgingRow, ExpenseRow, JournalRow, LedgerEntry } from "@/server/accounting";

const TYPE_LABEL: Record<AccountType, string> = { asset: "Harta", liability: "Utang", equity: "Modal", income: "Pendapatan", expense: "Biaya" };
const select = "h-12 w-full min-w-0 rounded-2xl border-2 border-line bg-white px-4 text-base outline-none focus:border-pitch";
const cell = "h-10 w-full min-w-0 rounded-xl border-2 border-line bg-white px-2 outline-none focus:border-pitch";
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
type Opt = { id: string; code: string; name: string; type: AccountType; isCash: boolean };

export function StatTile({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <span className="block text-sm text-ink-soft">{label}</span>
      <span className="mt-1 block text-xl font-extrabold tabular-nums">{value}</span>
    </>
  );
  return href ? (
    <Link href={href} className="rise rounded-[1.5rem] bg-chalk p-5 transition hover:-translate-y-0.5">{inner}</Link>
  ) : (
    <div className="rise rounded-[1.5rem] bg-chalk p-5">{inner}</div>
  );
}

// ---------- Pengeluaran ----------

export function ExpensePanel({
  today,
  expenses,
  accounts,
  branches,
  canManage,
}: {
  today: string;
  expenses: ExpenseRow[];
  accounts: Opt[];
  branches: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const form = useForm(ExpenseInput);
  const [problem, setProblem] = useState<string>();
  const costs = accounts.filter((a) => a.type === "expense" && !["Harga pokok penjualan", "Selisih stok", "Penyusutan"].includes(a.name));
  const sources = accounts.filter((a) => a.isCash);
  const total = expenses.filter((e) => !e.voided).reduce((s, e) => s + e.amount, 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const done = await form.submit(formValues(el), (input) => api("/expenses", { body: input }));
    if (!done) return;
    el.reset();
    router.refresh();
  }
  async function voidIt(x: ExpenseRow) {
    if (!confirm(`Batalkan pengeluaran "${x.note}"? Jurnalnya akan dibalik.`)) return;
    const r = await api(`/expenses/${x.id}`, { method: "DELETE" });
    if (!r.ok) return setProblem(r.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
      {canManage ? (
        <form onSubmit={onSubmit} noValidate aria-label="Catat pengeluaran" className="rise grid gap-4 rounded-[2rem] bg-chalk p-6">
          <h2 className="text-lg font-extrabold">Catat pengeluaran</h2>
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          <Field label="Untuk apa" name="note" placeholder="Contoh: Sewa lapangan Oktober" error={form.fields.note} />
          <Field label="Jumlah (Rp)" name="amount" inputMode="numeric" placeholder="300000" error={form.fields.amount} />
          <label className="grid gap-2 text-sm font-bold">
            Jenis biaya
            <select name="accountId" className={select} defaultValue="">
              <option value="" disabled>Pilih</option>
              {costs.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {form.fields.accountId ? <span className="font-bold text-flame">{form.fields.accountId}</span> : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Dibayar dari
              <select name="paidFrom" className={select} defaultValue={sources[0]?.id}>
                {sources.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <Field label="Tanggal" name="spentOn" type="date" max={today} defaultValue={today} error={form.fields.spentOn} />
          </div>
          <Field label="Dibayar ke (boleh kosong)" name="vendor" placeholder="Nama toko atau orang" error={form.fields.vendor} />
          {branches.length > 1 ? (
            <label className="grid gap-2 text-sm font-bold">
              Cabang (boleh kosong)
              <select name="branchId" className={select} defaultValue="">
                <option value="">Seluruh akademi</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <Button type="submit" disabled={form.pending} className="justify-self-start">{form.pending ? "Menyimpan…" : "Simpan pengeluaran"}</Button>
        </form>
      ) : null}
      <section className="rise grid gap-3">
        {problem ? <Alert tone="error">{problem}</Alert> : null}
        <p className="rounded-[1.5rem] bg-chalk p-4 font-bold">Total bulan ini: {rupiah(total)}</p>
        {expenses.length === 0 ? <EmptyState title="Belum ada pengeluaran">Catat sewa lapangan, perlengkapan, transport, dan biaya lain di sini.</EmptyState> : null}
        <ul className="grid gap-2">
          {expenses.map((x) => (
            <li key={x.id} className={`flex flex-wrap items-center gap-3 rounded-[1.5rem] bg-chalk p-4 ${x.voided ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1 basis-48">
                <p className={`break-words font-extrabold ${x.voided ? "line-through" : ""}`}>{x.note}</p>
                <p className="text-sm text-ink-soft">
                  {fmt(x.spentOn)} · {x.accountName} · dari {x.paidFromName}
                  {x.vendor ? ` · ${x.vendor}` : ""}
                  {x.branchName ? ` · ${x.branchName}` : ""}
                  {x.voided ? " · dibatalkan" : ""}
                </p>
              </div>
              <span className="font-extrabold tabular-nums">{rupiah(x.amount)}</span>
              {canManage && !x.voided ? (
                <Button size="sm" variant="ghost" aria-label="Batalkan" onClick={() => voidIt(x)}><Trash2 aria-hidden className="size-4" /></Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------- Laporan ----------

export function Report({
  title,
  sections,
  footer,
  twoCol,
  ledger,
}: {
  title: string;
  sections: { title: string; rows: { name: string; amount: number; amount2?: number }[]; total: number; total2?: number }[];
  footer?: { label: string; amount: number };
  twoCol?: boolean;
  ledger?: { opening: number; entries: LedgerEntry[] };
}) {
  return (
    <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <button type="button" onClick={() => window.print()} className="text-sm font-bold underline decoration-pitch decoration-2 underline-offset-4 print:hidden">
          Cetak
        </button>
      </div>
      {sections.map((s) => (
        <div key={s.title} className="mt-5">
          <div className="flex justify-between gap-3 border-b-2 border-mist pb-1 text-sm font-extrabold text-ink-soft">
            <span>{s.title}</span>
            {twoCol ? <span className="grid w-48 grid-cols-2 text-right sm:w-64"><span>Debit</span><span>Kredit</span></span> : null}
          </div>
          {s.rows.length === 0 ? <p className="py-2 text-sm text-ink-soft">Belum ada.</p> : null}
          <ul>
            {s.rows.map((r) => (
              <li key={r.name} className="flex justify-between gap-3 border-b border-mist py-2">
                <span className="min-w-0 break-words">{r.name}</span>
                {twoCol ? (
                  <span className="grid w-48 shrink-0 grid-cols-2 text-right tabular-nums sm:w-64">
                    <span>{r.amount ? rupiah(r.amount) : ""}</span>
                    <span>{r.amount2 ? rupiah(r.amount2) : ""}</span>
                  </span>
                ) : (
                  <span className={`shrink-0 tabular-nums ${r.amount < 0 ? "text-flame" : ""}`}>{rupiah(r.amount)}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-3 py-2 font-extrabold">
            <span>Jumlah {s.title.toLowerCase()}</span>
            {twoCol ? (
              <span className="grid w-48 shrink-0 grid-cols-2 text-right tabular-nums sm:w-64">
                <span>{rupiah(s.total)}</span>
                <span>{rupiah(s.total2 ?? 0)}</span>
              </span>
            ) : (
              <span className="tabular-nums">{rupiah(s.total)}</span>
            )}
          </div>
        </div>
      ))}
      {ledger ? (
        <div className="mt-4">
          <p className="flex justify-between border-b-2 border-mist py-2 text-sm font-bold"><span>Saldo awal</span><span className="tabular-nums">{rupiah(ledger.opening)}</span></p>
          {ledger.entries.length === 0 ? <p className="py-3 text-sm text-ink-soft">Tidak ada transaksi di periode ini.</p> : null}
          <ul>
            {ledger.entries.map((e) => (
              <li key={e.lineId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-mist py-2 sm:grid-cols-[5rem_minmax(0,1fr)_7rem_7rem_8rem]">
                <span className="text-sm text-ink-soft">{fmt(e.date)}</span>
                <span className="col-span-2 min-w-0 break-words sm:col-span-1">{e.memo}</span>
                <span className="text-sm tabular-nums text-pitch sm:text-right">{e.debit ? `+${rupiah(e.debit)}` : ""}</span>
                <span className="text-sm tabular-nums text-flame sm:text-right">{e.credit ? `-${rupiah(e.credit)}` : ""}</span>
                <span className="col-span-2 text-right font-bold tabular-nums sm:col-span-1">{rupiah(e.balance)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {footer ? (
        <div className="mt-4 flex justify-between gap-3 rounded-2xl bg-pitch px-4 py-3 font-extrabold text-white">
          <span>{footer.label}</span>
          <span className="tabular-nums">{rupiah(footer.amount)}</span>
        </div>
      ) : null}
    </section>
  );
}

export function AgingTable({ data }: { data: { asOf: string; rows: AgingRow[]; totals: number[]; total: number } }) {
  const heads = ["0-30 hari", "31-60 hari", "61-90 hari", "> 90 hari"];
  return (
    <section className="rise grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {heads.map((h, i) => (
          <StatTile key={h} label={h} value={rupiah(data.totals[i]!)} />
        ))}
      </div>
      <p className="rounded-[1.5rem] bg-chalk p-4 font-bold">Total iuran belum terbayar per {fmt(data.asOf)}: {rupiah(data.total)}</p>
      {data.rows.length === 0 ? <EmptyState title="Tidak ada tunggakan">Semua iuran sudah terbayar.</EmptyState> : null}
      <ul className="grid gap-2">
        {data.rows.map((r) => (
          <li key={r.playerId} className="rounded-[1.5rem] bg-chalk p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/pemain/${r.playerId}`} className="font-extrabold hover:underline">{r.fullName}</Link>
              <span className="font-extrabold tabular-nums">{rupiah(r.total)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {r.buckets.map((b, i) =>
                b ? (
                  <span key={i} className={`rounded-full px-2.5 py-0.5 font-bold ${i >= 2 ? "bg-flame/15 text-flame" : i === 1 ? "bg-sun/40" : "bg-mist"}`}>
                    {heads[i]}: {rupiah(b)}
                  </span>
                ) : null,
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Jurnal ----------

const SOURCE: Record<string, string> = {
  invoice: "Tagihan iuran",
  payment: "Pembayaran iuran",
  expense: "Pengeluaran",
  manual: "Manual",
  payroll: "Gaji",
  purchase: "Pembelian",
  sale: "Toko",
  event: "Event",
  asset: "Aset",
  depreciation: "Penyusutan",
  stock: "Stok",
};

export function JournalPanel({ today, journals, accounts, canManage }: { today: string; journals: JournalRow[]; accounts: Opt[]; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const num = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;
  const d = lines.reduce((s, l) => s + num(l.debit), 0);
  const c = lines.reduce((s, l) => s + num(l.credit), 0);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    const r = await api("/journals", {
      body: { date: f.get("date"), memo: f.get("memo"), lines: lines.filter((l) => l.accountId).map((l) => ({ accountId: l.accountId, debit: num(l.debit), credit: num(l.credit) })) },
    });
    setBusy(false);
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setOpen(false);
    setLines([{ accountId: "", debit: "", credit: "" }, { accountId: "", debit: "", credit: "" }]);
    router.refresh();
  }
  async function reverse(id: string) {
    if (!confirm("Balik jurnal ini? Jurnal baru dengan angka berlawanan akan dicatat hari ini.")) return;
    const r = await api(`/journals/${id}/reverse`, { method: "POST" });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <Alert tone="info">Jurnal tidak bisa diubah atau dihapus. Untuk mengoreksi, balik jurnalnya lalu catat yang benar.</Alert>
      {error && !open ? <Alert tone="error">{error}</Alert> : null}
      {canManage && !open ? (
        <Button className="justify-self-start" variant="outline" onClick={() => setOpen(true)}>
          <Plus aria-hidden className="size-5" /> Jurnal manual
        </Button>
      ) : null}
      {open ? (
        <form onSubmit={save} className="rise grid gap-3 rounded-[2rem] bg-chalk p-5">
          <h2 className="text-lg font-extrabold">Jurnal manual</h2>
          <p className="text-sm text-ink-soft">Contoh: setoran modal awal, pindah uang dari kas ke bank, atau saldo awal.</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <input type="date" name="date" defaultValue={today} max={today} aria-label="Tanggal" className={cell} />
            <input name="memo" placeholder="Keterangan" aria-label="Keterangan" className={cell} maxLength={200} />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]">
              <select aria-label={`Akun baris ${i + 1}`} value={l.accountId} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, accountId: e.target.value } : y)))} className={`${cell} col-span-2 sm:col-span-1`}>
                <option value="">Pilih akun</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
              <input inputMode="numeric" placeholder="Debit" aria-label="Debit" value={l.debit} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, debit: e.target.value, credit: "" } : y)))} className={cell} />
              <input inputMode="numeric" placeholder="Kredit" aria-label="Kredit" value={l.credit} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, credit: e.target.value, debit: "" } : y)))} className={cell} />
              <Button size="sm" variant="ghost" aria-label="Hapus baris" disabled={lines.length <= 2} onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setLines((x) => [...x, { accountId: "", debit: "", credit: "" }])}>Tambah baris</Button>
            <span className={`text-sm font-bold ${d === c && d > 0 ? "text-pitch" : "text-flame"}`}>
              Debit {rupiah(d)} · Kredit {rupiah(c)} {d === c && d > 0 ? "· seimbang" : "· belum seimbang"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || d !== c || d === 0}>Simpan jurnal</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
          </div>
        </form>
      ) : null}
      {journals.length === 0 ? <EmptyState title="Belum ada jurnal bulan ini">Jurnal tercatat otomatis saat ada tagihan, pembayaran, atau pengeluaran.</EmptyState> : null}
      <ul className="grid gap-2">
        {journals.map((j) => (
          <li key={j.id} className={`rise rounded-[1.5rem] bg-chalk p-4 ${j.reversed ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 basis-48 font-bold break-words">{j.memo}</p>
              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold">{SOURCE[j.source] ?? j.source}</span>
              {j.reversed ? <span className="rounded-full bg-flame/15 px-2.5 py-0.5 text-xs font-bold text-flame">Dibalik</span> : null}
              {j.isReversal ? <span className="rounded-full bg-sun/40 px-2.5 py-0.5 text-xs font-bold">Jurnal balik</span> : null}
            </div>
            <p className="text-xs text-ink-soft">{fmt(j.entryDate)} · {rupiah(j.total)}</p>
            <ul className="mt-2 grid gap-0.5 text-sm">
              {j.lines.map((l, i) => (
                <li key={i} className={`flex justify-between gap-3 ${l.credit ? "pl-5" : ""}`}>
                  <span className="min-w-0 truncate">{l.code} {l.name}</span>
                  <span className="shrink-0 tabular-nums">{l.debit ? `D ${rupiah(l.debit)}` : `K ${rupiah(l.credit)}`}</span>
                </li>
              ))}
            </ul>
            {canManage && j.source === "manual" && !j.reversed && !j.isReversal ? (
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => reverse(j.id)}>Balik jurnal</Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Akun ----------

export function AccountsPanel({ accounts, canManage }: { accounts: AccountRow[]; canManage: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const f = new FormData(el);
    const r = await api("/accounts", { body: { code: f.get("code"), name: f.get("name"), type: f.get("type"), isCash: f.get("isCash") === "on" } });
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setError(undefined);
    el.reset();
    router.refresh();
  }
  async function rename(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await api(`/accounts/${id}`, { method: "PUT", body: { code: f.get("code"), name: f.get("name") } });
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setEditing(null);
    router.refresh();
  }
  async function archive(a: AccountRow) {
    if (!confirm(`Arsipkan akun ${a.name}?`)) return;
    const r = await api(`/accounts/${a.id}`, { method: "DELETE" });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  const groups = (["asset", "liability", "equity", "income", "expense"] as AccountType[]).map((t) => ({ t, rows: accounts.filter((a) => a.type === t) }));
  return (
    <div className="grid gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {canManage ? (
        <form onSubmit={add} className="rise grid gap-3 rounded-[2rem] bg-chalk p-5 sm:grid-cols-[7rem_minmax(0,1fr)_10rem_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-bold">Kode<input name="code" placeholder="6-450" className={cell} /></label>
          <label className="grid gap-1 text-sm font-bold">Nama akun<input name="name" placeholder="Konsumsi" className={cell} /></label>
          <label className="grid gap-1 text-sm font-bold">
            Jenis
            <select name="type" className={cell} defaultValue="expense">
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <Button type="submit">Tambah akun</Button>
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-4">
            <input type="checkbox" name="isCash" className="size-5 accent-pitch" /> Akun kas atau rekening bank (untuk Harta)
          </label>
        </form>
      ) : null}
      {groups.map((g) => (
        <section key={g.t} className="rise rounded-[2rem] bg-chalk p-5">
          <h2 className="font-extrabold">{TYPE_LABEL[g.t]}</h2>
          <ul className="mt-2">
            {g.rows.map((a) =>
              editing === a.id ? (
                <li key={a.id}>
                  <form onSubmit={(e) => rename(e, a.id)} className="flex flex-wrap items-center gap-2 py-2">
                    <input name="code" defaultValue={a.code} className={`${cell} w-24`} aria-label="Kode" />
                    <input name="name" defaultValue={a.name} className={`${cell} min-w-0 flex-1`} aria-label="Nama" />
                    <Button size="sm" type="submit">Simpan</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
                  </form>
                </li>
              ) : (
                <li key={a.id} className="flex flex-wrap items-center gap-2 border-b border-mist py-2">
                  <span className="w-14 shrink-0 text-sm text-ink-soft tabular-nums">{a.code}</span>
                  <span className="min-w-0 flex-1 font-bold break-words">
                    {a.name}
                    {a.isCash ? <span className="ml-2 rounded-full bg-turf-soft px-2 py-0.5 text-xs text-pitch">Kas/bank</span> : null}
                    {a.systemKey ? <span className="ml-2 text-xs font-normal text-ink-soft">otomatis</span> : null}
                  </span>
                  <span className="tabular-nums">{rupiah(a.balance)}</span>
                  {canManage ? (
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(a.id)}>Ubah</Button>
                      {!a.systemKey ? <Button size="sm" variant="ghost" onClick={() => archive(a)}>Arsipkan</Button> : null}
                    </span>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------- Rekonsiliasi dan tutup buku ----------

export function BooksPanel({
  today,
  locks,
  canClose,
  canManage,
  accounts,
  accountId,
  uncleared,
  last,
}: {
  today: string;
  locks: string[];
  canClose: boolean;
  canManage: boolean;
  accounts: { id: string; name: string }[];
  accountId: string;
  uncleared: LedgerEntry[];
  last: { date: string; statement: number; cleared: number; difference: number } | null;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<number | null>(null);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 1 - i);
    return d.toISOString().slice(0, 7);
  });

  async function toggleLock(m: string, locked: boolean) {
    if (locked && !confirm(`Tutup buku ${monthLabel(m)}? Setelah ditutup, tidak ada catatan baru bertanggal bulan itu.`)) return;
    const r = await api("/period-locks", { method: "PUT", body: { month: m, locked } });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  async function doReconcile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await api<{ difference: number }>("/reconcile", {
      body: { accountId, statementDate: f.get("statementDate"), statementBalance: String(f.get("statementBalance")).replace(/[^0-9-]/g, ""), lineIds: [...picked] },
    });
    if (!r.ok) return setError(r.error.message);
    setResult(r.data.difference);
    setPicked(new Set());
    router.refresh();
  }
  const pickedSum = uncleared.filter((x) => picked.has(x.lineId)).reduce((s, x) => s + x.debit - x.credit, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      {error ? <div className="lg:col-span-2"><Alert tone="error">{error}</Alert></div> : null}
      <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Rekonsiliasi kas/bank</h2>
        <p className="mt-1 text-sm text-ink-soft">Cocokkan catatan dengan rekening koran atau hitungan uang tunai. Centang transaksi yang sudah muncul di rekening koran.</p>
        <nav className="mt-3 flex flex-wrap gap-2">
          {accounts.map((a) => (
            <Link key={a.id} href={`/keuangan?tab=buku&akun=${a.id}`} className={`rounded-full px-3 py-1.5 text-sm font-bold ${a.id === accountId ? "bg-pitch text-white" : "bg-mist"}`}>{a.name}</Link>
          ))}
        </nav>
        {last ? (
          <p className="mt-3 text-sm">
            Terakhir: {fmt(last.date)}, selisih <b className={last.difference ? "text-flame" : "text-pitch"}>{rupiah(last.difference)}</b>
          </p>
        ) : null}
        {result !== null ? <div className="mt-3"><Alert tone={result === 0 ? "success" : "error"}>{result === 0 ? "Cocok, tidak ada selisih." : `Masih ada selisih ${rupiah(result)}. Cek transaksi yang belum dicatat.`}</Alert></div> : null}
        {canManage ? (
          <form onSubmit={doReconcile} className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm font-bold">Tanggal rekening koran<input type="date" name="statementDate" defaultValue={today} max={today} className={cell} /></label>
              <label className="grid gap-1 text-sm font-bold">Saldo di rekening koran<input name="statementBalance" inputMode="numeric" className={cell} /></label>
            </div>
            <ul className="max-h-80 overflow-y-auto rounded-2xl bg-mist p-2">
              {uncleared.length === 0 ? <li className="p-2 text-sm text-ink-soft">Semua transaksi sudah dicocokkan.</li> : null}
              {uncleared.map((x) => (
                <li key={x.lineId}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl p-2 hover:bg-white">
                    <input
                      type="checkbox"
                      checked={picked.has(x.lineId)}
                      onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(x.lineId); else n.delete(x.lineId); return n; })}
                      className="size-5 shrink-0 accent-pitch"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{fmt(x.date)} · {x.memo}</span>
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${x.credit ? "text-flame" : "text-pitch"}`}>{x.debit ? `+${rupiah(x.debit)}` : `-${rupiah(x.credit)}`}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-sm">Dicentang: <b>{rupiah(pickedSum)}</b></p>
            <Button type="submit" className="justify-self-start">Cocokkan</Button>
          </form>
        ) : null}
      </section>
      <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Tutup buku per bulan</h2>
        <p className="mt-1 text-sm text-ink-soft">Bulan yang ditutup tidak bisa menerima catatan baru, jadi laporan bulan itu tetap. Hanya Pemilik yang bisa menutup atau membuka.</p>
        <ul className="mt-3 grid gap-2">
          {months.map((m) => {
            const locked = locks.includes(m);
            return (
              <li key={m} className="flex items-center gap-3 rounded-2xl bg-mist px-3 py-2">
                {locked ? <Lock aria-hidden className="size-4 text-pitch" /> : <LockOpen aria-hidden className="size-4 text-ink-soft" />}
                <span className="min-w-0 flex-1 font-bold">{monthLabel(m)}</span>
                <span className="text-sm text-ink-soft">{locked ? "Ditutup" : "Terbuka"}</span>
                {canClose ? (
                  <Button size="sm" variant={locked ? "ghost" : "outline"} onClick={() => toggleLock(m, !locked)}>{locked ? "Buka" : "Tutup"}</Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
