import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { monthLabel, rupiah, shiftMonth } from "@/lib/money";
import { accountOptions } from "@/server/accounting";
import { inAcademy } from "@/server/context";
import { getRun, listPayProfiles } from "@/server/payroll";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";
import { PayProfiles, RunPanel } from "./parts";

export const metadata: Metadata = { title: "Gaji" };

export default async function GajiPage({ searchParams }: { searchParams: Promise<{ bulan?: string; tab?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("payroll") || !ctx.can("payroll.manage") || ctx.branchIds !== null) redirect("/");
  const sp = await searchParams;
  const today = await inAcademy(ctx, academyToday);
  const month = sp.bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan) && sp.bulan <= today.slice(0, 7) ? sp.bulan : today.slice(0, 7);
  const tab = sp.tab === "atur" ? "atur" : "proses";
  const [run, profiles, accounts] = await Promise.all([getRun(ctx, month), listPayProfiles(ctx), accountOptions(ctx)]);
  const q = (m: string) => `/gaji?bulan=${m}`;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Gaji" subtitle="Hitung gaji dari pengaturan per staf, sesi melatih, dan absensi. Disetujui, dibayar, dan langsung masuk pembukuan." />
      <nav aria-label="Bagian gaji" className="rise mb-4 flex flex-wrap gap-2">
        {[
          { k: "proses", l: "Gaji bulanan", h: q(month) },
          { k: "atur", l: `Pengaturan gaji (${profiles.filter((p) => p.configured).length}/${profiles.length})`, h: "/gaji?tab=atur" },
        ].map((t) => (
          <Link key={t.k} href={t.h} aria-current={tab === t.k ? "page" : undefined} className={`flex h-11 items-center rounded-full px-4 font-bold ${tab === t.k ? "bg-pitch text-white" : "bg-chalk hover:bg-mist"}`}>
            {t.l}
          </Link>
        ))}
      </nav>
      {tab === "atur" ? (
        <PayProfiles profiles={profiles} />
      ) : (
        <>
          <div className="rise mb-4 flex items-center justify-between gap-2 rounded-[1.5rem] bg-chalk p-2">
            <Link href={q(shiftMonth(month, -1))} className="rounded-full px-4 py-2 font-bold hover:bg-mist">‹</Link>
            <span className="font-extrabold">{monthLabel(month)}</span>
            {month < today.slice(0, 7) ? <Link href={q(shiftMonth(month, 1))} className="rounded-full px-4 py-2 font-bold hover:bg-mist">›</Link> : <span className="w-10" />}
          </div>
          {run ? <p className="rise mb-4 text-lg font-extrabold">Total gaji bersih: {rupiah(run.total)}</p> : null}
          <RunPanel
            month={month}
            today={today}
            run={run}
            hasProfiles={profiles.some((p) => p.configured)}
            cashAccounts={accounts.filter((a) => a.isCash).map((a) => ({ id: a.id, name: a.name }))}
          />
        </>
      )}
    </div>
  );
}
