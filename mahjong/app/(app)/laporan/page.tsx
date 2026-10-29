import type { Metadata } from "next";
import Link from "next/link";
import { Bars } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { METHOD_LABEL } from "@/lib/billing";
import { addDays, dayLabel, shortDay } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { report } from "@/server/reports";
import { requirePage } from "@/server/routing";
import { getVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Laporan" };

const RANGES = [["7", "7 hari"], ["30", "30 hari"], ["90", "90 hari"]] as const;

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ hari?: string }> }) {
  const ctx = await requirePage("reports.read");
  const venue = await getVenue(ctx);
  const { hari } = await searchParams;
  const days = RANGES.some(([v]) => v === hari) ? Number(hari) : 7;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: venue.timezone }).format(new Date());
  const r = await report(ctx, addDays(today, -(days - 1)), today);
  const t = r.totals;
  const maxMethod = Math.max(1, ...r.methods.map((m) => m.amount));
  const peak = r.hours.indexOf(Math.max(...r.hours));
  const open = Number(venue.settings.openTime.slice(0, 2));
  const close = Math.min(23, Number(venue.settings.closeTime.slice(0, 2)) || 23);
  const hours = r.hours.map((n, h) => ({ label: String(h).padStart(2, "0"), value: n })).filter((h) => Number(h.label) >= open && Number(h.label) <= Math.max(close, open + 1));

  const stat = (label: string, value: string, sub?: string) => (
    <div className="tile p-4"><p className="text-sm font-semibold text-ink-soft">{label}</p><p className="tnum mt-1 text-2xl font-extrabold">{value}</p>{sub ? <p className="text-xs text-ink-soft">{sub}</p> : null}</div>
  );

  return (
    <>
      <PageHeader title="Laporan" subtitle={`${dayLabel(r.from)} - ${dayLabel(r.to)}`} />
      <nav aria-label="Rentang waktu" className="rise mb-5 flex gap-2">
        {RANGES.map(([v, l]) => <Link key={v} href={`/laporan?hari=${v}`} aria-current={Number(v) === days ? "page" : undefined} className={`flex h-11 items-center rounded-xl border-2 px-4 font-bold ${Number(v) === days ? "border-pitch bg-pitch text-white" : "border-line bg-chalk"}`}>{l}</Link>)}
      </nav>

      <div className="rise grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="felt col-span-2 rounded-2xl p-5 text-white shadow-[0_4px_0_var(--color-night)] lg:col-span-1"><p className="text-sm font-bold text-white/70">Omzet</p><p className="tnum mt-1 text-3xl font-extrabold">{rupiah(t.revenue)}</p><p className="text-sm text-white/70">{t.sessions} sesi · rata-rata {rupiah(t.avgPerSession)}</p></div>
        {stat("Sewa meja", rupiah(t.table), `${t.hoursPlayed} jam main`)}
        {stat("Makanan & minuman", rupiah(t.fnb))}
        {stat("Biaya turnamen", rupiah(t.tournament))}
      </div>

      <section className="tile rise mt-5 p-5" aria-labelledby="harian">
        <h2 id="harian" className="text-lg font-extrabold">Omzet per hari</h2>
        <Bars items={r.days.map((d) => ({ label: days > 14 ? String(Number(d.date.slice(8))) : shortDay(d.date), value: d.table + d.fnb + d.tournament }))} format={rupiah} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="tile rise p-5" aria-labelledby="jam">
          <h2 id="jam" className="text-lg font-extrabold">Jam ramai</h2>
          <p className="text-sm text-ink-soft">{r.hours[peak] ? `Paling ramai sekitar pukul ${String(peak).padStart(2, "0")}.00 (sesi dimulai).` : "Belum ada sesi."}</p>
          <Bars items={hours} height={110} />
        </section>
        <section className="tile rise p-5" aria-labelledby="meja">
          <h2 id="meja" className="text-lg font-extrabold">Pemakaian meja</h2>
          <ul className="mt-3 grid gap-3">
            {r.tables.map((x) => (
              <li key={x.name}>
                <div className="flex justify-between text-sm"><b>{x.name}</b><span className="tnum text-ink-soft">{x.utilization}% jam buka · {rupiah(x.revenue)}</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-md bg-mist"><div className="h-full rounded-md bg-pitch-2" style={{ width: `${x.utilization}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="tile rise p-5" aria-labelledby="bayar">
          <h2 id="bayar" className="text-lg font-extrabold">Cara bayar</h2>
          {r.methods.length ? (
            <ul className="mt-3 grid gap-3">
              {r.methods.map((m) => (
                <li key={m.method}>
                  <div className="flex justify-between text-sm"><b>{METHOD_LABEL[m.method as keyof typeof METHOD_LABEL] ?? m.method}</b><span className="tnum">{rupiah(m.amount)}</span></div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-md bg-mist"><div className="h-full rounded-md bg-ember" style={{ width: `${(m.amount / maxMethod) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-ink-soft">Belum ada pembayaran.</p>}
          <p className="tnum mt-4 border-t border-line pt-3 text-sm text-ink-soft">Isi saldo member: <b className="text-ink">{rupiah(r.topups)}</b> (bukan omzet sampai dipakai) · Diskon member: <b className="text-ink">{rupiah(t.discount)}</b></p>
        </section>
        <section className="tile rise p-5" aria-labelledby="laris">
          <h2 id="laris" className="text-lg font-extrabold">Menu terlaris & member teratas</h2>
          {r.topMenu.length ? <ol className="tnum mt-3 divide-y divide-line">{r.topMenu.map((m) => <li key={m.name} className="flex justify-between py-2"><span>{m.name} <span className="text-ink-soft">×{m.qty}</span></span><b>{rupiah(m.revenue)}</b></li>)}</ol> : <p className="mt-2 text-ink-soft">Belum ada pesanan.</p>}
          {r.topMembers.length ? <ol className="tnum mt-4 divide-y divide-line border-t border-line">{r.topMembers.map((m) => <li key={m.name} className="flex justify-between py-2"><span>{m.name} <span className="text-ink-soft">{m.visits}×</span></span><b>{rupiah(m.spent)}</b></li>)}</ol> : null}
          <p className="mt-4 text-sm text-ink-soft">Member baru: <b className="text-ink">{r.newMembers}</b> · Booking tidak datang: <b className="text-ink">{r.noShows}</b></p>
        </section>
      </div>
    </>
  );
}
