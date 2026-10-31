import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { monthLabel, rupiah, shiftMonth } from "@/lib/money";
import {
  accountOptions,
  balanceSheet,
  cashFlow,
  generalLedger,
  lastReconciliation,
  listAccounts,
  listExpenses,
  listJournals,
  listLocks,
  profitLoss,
  receivablesAging,
  trialBalance,
} from "@/server/accounting";
import { listBranches } from "@/server/branches";
import { inAcademy } from "@/server/context";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { AccountsPanel, AgingTable, BooksPanel, ExpensePanel, JournalPanel, Report, StatTile } from "./parts";

export const metadata: Metadata = { title: "Keuangan" };

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "pengeluaran", label: "Pengeluaran" },
  { key: "laporan", label: "Laporan" },
  { key: "piutang", label: "Piutang" },
  { key: "jurnal", label: "Jurnal" },
  { key: "akun", label: "Akun" },
  { key: "buku", label: "Rekonsiliasi dan tutup buku" },
] as const;

const REPORTS = [
  { key: "labarugi", label: "Laba rugi" },
  { key: "neraca", label: "Neraca" },
  { key: "aruskas", label: "Arus kas" },
  { key: "saldo", label: "Neraca saldo" },
] as const;

type SP = { tab?: string; bulan?: string; laporan?: string; akun?: string };

export default async function KeuanganPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("accounting") || !ctx.can("accounting.read")) redirect("/");
  if (ctx.branchIds !== null) redirect("/");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "ringkasan";
  const today = await inAcademy(ctx, academyToday);
  const month = sp.bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan) ? sp.bulan : today.slice(0, 7);
  const from = `${month}-01`;
  const endOfMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const to = endOfMonth < today ? endOfMonth : today;
  const manage = ctx.can("accounting.manage");
  const link = (p: Partial<SP>) => {
    const q = new URLSearchParams({ tab, ...(month !== today.slice(0, 7) ? { bulan: month } : {}), ...p } as Record<string, string>);
    return `/keuangan?${q}`;
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="Keuangan" subtitle="Pembukuan otomatis dari iuran, pengeluaran, gaji, stok, dan toko. Semua angka dalam rupiah." />
      <nav aria-label="Bagian keuangan" className="rise -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/keuangan?tab=${t.key}${month !== today.slice(0, 7) ? `&bulan=${month}` : ""}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center rounded-full px-4 font-bold transition ${tab === t.key ? "bg-pitch text-white" : "bg-chalk hover:bg-mist"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab !== "akun" && tab !== "buku" ? (
        <div className="rise mb-4 flex items-center gap-2">
          <Link href={link({ bulan: shiftMonth(month, -1) })} aria-label="Bulan sebelumnya" className="grid size-11 place-items-center rounded-full bg-chalk font-extrabold hover:bg-white">‹</Link>
          <p className="min-w-0 flex-1 text-center text-lg font-extrabold">{monthLabel(month)}</p>
          <Link href={link({ bulan: shiftMonth(month, 1) })} aria-label="Bulan berikutnya" className="grid size-11 place-items-center rounded-full bg-chalk font-extrabold hover:bg-white">›</Link>
        </div>
      ) : null}

      {tab === "ringkasan" ? await Summary() : null}
      {tab === "pengeluaran" ? (
        <ExpensePanel
          today={today}
          expenses={await listExpenses(ctx, month)}
          accounts={await accountOptions(ctx)}
          branches={(await listBranches(ctx)).map((b) => ({ id: b.id, name: b.name }))}
          canManage={manage}
        />
      ) : null}
      {tab === "laporan" ? await Reports() : null}
      {tab === "piutang" ? <AgingTable data={await receivablesAging(ctx, to)} /> : null}
      {tab === "jurnal" ? <JournalPanel today={today} journals={await listJournals(ctx, from, to)} accounts={await accountOptions(ctx)} canManage={manage} /> : null}
      {tab === "akun" ? <AccountsPanel accounts={await listAccounts(ctx)} canManage={manage} /> : null}
      {tab === "buku" ? await Books() : null}
    </div>
  );

  async function Summary() {
    const [pl, accounts, aging] = await Promise.all([profitLoss(ctx, from, to), listAccounts(ctx), receivablesAging(ctx, to)]);
    const cash = accounts.filter((a) => a.isCash);
    return (
      <div className="grid gap-4">
        <section className="rise rounded-[2rem] bg-pitch p-6 text-white sm:p-8">
          <p className="font-semibold text-white/70">Laba (rugi) {monthLabel(month)}</p>
          <p className={`mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl ${pl.net < 0 ? "text-sun" : ""}`}>{rupiah(pl.net)}</p>
          <p className="mt-2 text-sm text-white/80">
            Pendapatan {rupiah(pl.totalIncome)} · Biaya {rupiah(pl.totalExpense)}
          </p>
        </section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cash.map((c) => (
            <StatTile key={c.id} label={`Saldo ${c.name}`} value={rupiah(c.balance)} href={`/keuangan?tab=laporan&laporan=buku&akun=${c.id}`} />
          ))}
          <StatTile label="Iuran belum terbayar" value={rupiah(aging.total)} href="/keuangan?tab=piutang" />
        </div>
        {manage ? (
          <Link href="/keuangan?tab=pengeluaran" className="rise inline-flex h-12 items-center justify-center justify-self-start rounded-full bg-ember px-6 font-extrabold text-ink transition hover:-translate-y-0.5">
            Catat pengeluaran
          </Link>
        ) : null}
      </div>
    );
  }

  async function Reports() {
    const which = sp.laporan === "buku" ? "buku" : REPORTS.some((r) => r.key === sp.laporan) ? sp.laporan! : "labarugi";
    const nav = (
      <nav aria-label="Jenis laporan" className="rise mb-4 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={link({ laporan: r.key })}
            aria-current={which === r.key ? "page" : undefined}
            className={`h-10 rounded-full px-4 py-2 text-sm font-bold ${which === r.key ? "bg-ember text-ink" : "bg-chalk hover:bg-mist"}`}
          >
            {r.label}
          </Link>
        ))}
        <Link href={link({ laporan: "buku" })} className={`h-10 rounded-full px-4 py-2 text-sm font-bold ${which === "buku" ? "bg-ember text-ink" : "bg-chalk hover:bg-mist"}`}>
          Buku besar
        </Link>
      </nav>
    );
    if (which === "labarugi") {
      const r = await profitLoss(ctx, from, to);
      return (
        <>
          {nav}
          <Report
            title={`Laba rugi ${monthLabel(month)}`}
            sections={[
              { title: "Pendapatan", rows: r.income, total: r.totalIncome },
              { title: "Biaya", rows: r.expense, total: r.totalExpense },
            ]}
            footer={{ label: r.net >= 0 ? "Laba bersih" : "Rugi bersih", amount: r.net }}
          />
        </>
      );
    }
    if (which === "neraca") {
      const r = await balanceSheet(ctx, to);
      return (
        <>
          {nav}
          <Report
            title={`Neraca per ${to}`}
            sections={[
              { title: "Harta", rows: r.assets, total: r.totalAssets },
              { title: "Utang", rows: r.liabilities, total: r.totalLiabilities },
              { title: "Modal", rows: r.equity, total: r.totalEquity },
            ]}
            footer={{ label: r.balanced ? "Seimbang: Harta = Utang + Modal" : "Tidak seimbang, hubungi dukungan", amount: r.totalLiabilities + r.totalEquity }}
          />
        </>
      );
    }
    if (which === "aruskas") {
      const r = await cashFlow(ctx, from, to);
      return (
        <>
          {nav}
          <Report
            title={`Arus kas ${monthLabel(month)}`}
            sections={[
              { title: "Saldo awal", rows: r.accounts.map((a) => ({ name: a.name, amount: a.opening })), total: r.opening },
              { title: "Masuk dan keluar", rows: r.groups.map((g) => ({ name: g.label, amount: g.amount })), total: r.closing - r.opening },
            ]}
            footer={{ label: "Saldo akhir kas dan bank", amount: r.closing }}
          />
        </>
      );
    }
    if (which === "saldo") {
      const r = await trialBalance(ctx, to);
      return (
        <>
          {nav}
          <Report
            title={`Neraca saldo per ${to}`}
            twoCol
            sections={[{ title: "Akun", rows: r.rows.map((x) => ({ name: `${x.code} ${x.name}`, amount: x.debit, amount2: x.credit })), total: r.totalDebit, total2: r.totalCredit }]}
          />
        </>
      );
    }
    const accounts = await accountOptions(ctx);
    const accountId = accounts.some((a) => a.id === sp.akun) ? sp.akun! : accounts.find((a) => a.isCash)?.id ?? accounts[0]!.id;
    const gl = await generalLedger(ctx, accountId, from, to);
    return (
      <>
        {nav}
        <nav aria-label="Pilih akun" className="rise mb-3 flex gap-2 overflow-x-auto pb-1">
          {accounts.map((a) => (
            <Link key={a.id} href={link({ laporan: "buku", akun: a.id })} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${a.id === accountId ? "bg-pitch text-white" : "bg-chalk"}`}>
              {a.name}
            </Link>
          ))}
        </nav>
        <Report
          title={`Buku besar ${gl.account.code} ${gl.account.name}`}
          ledger={{ opening: gl.opening, entries: gl.entries }}
          sections={[]}
        />
      </>
    );
  }

  async function Books() {
    const accounts = (await accountOptions(ctx)).filter((a) => a.isCash);
    const accountId = accounts.some((a) => a.id === sp.akun) ? sp.akun! : accounts[0]!.id;
    const gl = await generalLedger(ctx, accountId, "2000-01-01", today);
    return (
      <BooksPanel
        today={today}
        locks={await listLocks(ctx)}
        canClose={ctx.can("accounting.close")}
        canManage={manage}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        accountId={accountId}
        uncleared={gl.entries.filter((e) => !e.cleared)}
        last={await lastReconciliation(ctx, accountId)}
      />
    );
  }
}
