import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { monthLabel, rupiah, shiftMonth } from "@/lib/money";
import { getAcademy } from "@/server/academy";
import { inAcademy } from "@/server/context";
import { listTeamFees, monthSummary } from "@/server/fees";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { FeeSettings } from "./fee-settings";
import { GenerateButton } from "./generate-button";
import { InvoiceList } from "./invoice-list";

export const metadata: Metadata = { title: "Iuran" };

export default async function IuranPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.can("billing.read")) redirect("/");
  const sp = await searchParams;
  const current = (await inAcademy(ctx, academyToday)).slice(0, 7);
  const month = sp.bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan) ? sp.bulan : current;
  const [summary, fees, academy] = await Promise.all([monthSummary(ctx, month), listTeamFees(ctx), getAcademy(ctx)]);
  const canManage = ctx.can("billing.manage");
  const hasFees = fees.some((f) => f.amount !== null);
  const canGenerate = canManage && month >= shiftMonth(current, -1) && month <= shiftMonth(current, 1);
  const pct = summary.billed ? Math.round((summary.collected / summary.billed) * 100) : 0;
  const nav = (m: string) => (m === current ? "/iuran" : `/iuran?bulan=${m}`);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Iuran" subtitle="Catat iuran bulanan pemain. Pembayaran tetap lewat tunai atau transfer biasa." />

      <div className="rise mb-4 flex items-center gap-2">
        <Link href={nav(shiftMonth(month, -1))} aria-label="Bulan sebelumnya" className="grid size-11 place-items-center rounded-full bg-chalk hover:bg-white">
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <p className="min-w-0 flex-1 text-center text-lg font-extrabold">{monthLabel(month)}</p>
        <Link href={nav(shiftMonth(month, 1))} aria-label="Bulan berikutnya" className="grid size-11 place-items-center rounded-full bg-chalk hover:bg-white">
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      </div>

      {summary.invoices.length ? (
        <section className="rise mb-4 rounded-[2rem] bg-pitch p-6 text-white sm:p-8" aria-label="Ringkasan bulan ini">
          <p className="font-semibold text-white/70">Belum terbayar</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">{rupiah(summary.outstanding)}</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15" aria-hidden>
            <div className="h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-white/80">
            Terkumpul {rupiah(summary.collected)} dari {rupiah(summary.billed)}, {summary.unpaidCount} pemain belum bayar
          </p>
        </section>
      ) : null}

      {canGenerate && hasFees && summary.missing > 0 ? (
        <div className="rise mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-ember-soft p-5">
          <p className="font-bold text-ember-deep">
            {summary.missing} pemain belum punya tagihan {monthLabel(month)}.
          </p>
          <GenerateButton month={month} label={summary.invoices.length ? "Buat tagihan yang kurang" : `Buat tagihan ${monthLabel(month)}`} />
        </div>
      ) : null}

      {summary.invoices.length ? (
        <section className="rise" aria-label="Tagihan">
          <InvoiceList invoices={summary.invoices} month={month} academyName={academy.name} canManage={canManage} />
        </section>
      ) : !hasFees ? (
        <EmptyState title="Atur tarif iuran dulu">
          Isi iuran per bulan untuk tiap tim di bawah. Setelah itu tagihan semua pemain bisa dibuat sekali klik.
        </EmptyState>
      ) : summary.missing === 0 ? (
        <p className="rise rounded-[2rem] bg-chalk p-8 text-center text-ink-soft">Tidak ada tagihan di bulan ini.</p>
      ) : null}

      <details className="rise mt-6 rounded-[2rem] bg-chalk p-6" open={!hasFees}>
        <summary className="cursor-pointer text-lg font-extrabold marker:text-ink-soft">Tarif per tim</summary>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Pemain di beberapa tim ditagih sekali dengan tarif tertinggi. Ubah tarif tidak mengubah tagihan yang sudah dibuat.
        </p>
        <FeeSettings fees={fees} canManage={canManage} />
      </details>
    </div>
  );
}
