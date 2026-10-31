import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AreaTrend, BarList } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { monthLabel, rupiah } from "@/lib/money";
import { analytics, type BranchStats } from "@/server/analytics";
import { inAcademy } from "@/server/context";
import { requireAcademyPage } from "@/server/routing";
import { academyToday } from "@/server/schedule";

export const metadata: Metadata = { title: "Analitik" };

const RANGES = [
  { key: "bulan", label: "Bulan ini" },
  { key: "3bulan", label: "3 bulan" },
  { key: "tahun", label: "Tahun ini" },
] as const;
const short = (m: string) => monthLabel(m).slice(0, 3);
const juta = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".0", "")} jt` : rupiah(n));
const niceMax = (v: number) => (v <= 0 ? 10 : Math.ceil((v * 1.15) / 10 ** Math.floor(Math.log10(v))) * 10 ** Math.floor(Math.log10(v)));

export default async function AnalitikPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.can("analytics.read")) redirect("/");
  const periode = (await searchParams).periode;
  const range = RANGES.find((r) => r.key === periode)?.key ?? "bulan";
  const today = await inAcademy(ctx, academyToday);
  const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 2);
  const from = range === "tahun" ? `${today.slice(0, 4)}-01-01` : range === "3bulan" ? d.toISOString().slice(0, 10) : `${today.slice(0, 7)}-01`;
  const a = await analytics(ctx, from, today);
  const multi = a.branches.filter((b) => b.branchId).length > 1 || a.branches.some((b) => !b.branchId);
  const cols: { key: keyof BranchStats; label: string; fmt: (v: number) => string; money?: boolean }[] = [
    { key: "activePlayers", label: "Pemain aktif", fmt: String },
    { key: "newPlayers", label: "Baru", fmt: String },
    { key: "leftPlayers", label: "Berhenti", fmt: String },
    { key: "sessions", label: "Sesi", fmt: String },
    { key: "attendanceRate", label: "Kehadiran", fmt: (v) => `${v}%` },
    { key: "collected", label: "Iuran masuk", fmt: rupiah, money: true },
    { key: "expenses", label: "Pengeluaran", fmt: rupiah, money: true },
    { key: "outstanding", label: "Tunggakan", fmt: rupiah, money: true },
  ];
  const shown = cols.filter((c) => !c.money || a.money);
  const maxP = niceMax(Math.max(...a.trend.map((t) => t.activePlayers)));
  const maxM = niceMax(Math.max(...a.trend.map((t) => Math.max(t.collected ?? 0, t.expenses ?? 0))));
  const tiles = [
    { l: "Pemain aktif", v: String(a.total.activePlayers), n: `+${a.total.newPlayers} baru, ${a.total.leftPlayers} berhenti` },
    { l: "Kehadiran latihan", v: a.total.attendanceRate === null ? "-" : `${a.total.attendanceRate}%`, n: `${a.total.sessions} sesi` },
    ...(a.money
      ? [
          { l: "Iuran masuk", v: juta(a.total.collected ?? 0), n: `Tunggakan ${juta(a.total.outstanding ?? 0)}` },
          { l: "Pengeluaran", v: juta(a.total.expenses ?? 0), n: `Selisih ${juta((a.total.collected ?? 0) - (a.total.expenses ?? 0))}` },
        ]
      : []),
  ];

  return (
    <div className="max-w-6xl">
      <PageHeader title="Analitik" subtitle="Bandingkan cabang dan lihat tren pemain, kehadiran, dan uang." />
      <nav aria-label="Periode" className="rise mb-5 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link key={r.key} href={`/analitik?periode=${r.key}`} aria-current={range === r.key ? "page" : undefined} className={`flex h-11 items-center rounded-full px-4 font-bold ${range === r.key ? "bg-pitch text-white" : "bg-chalk hover:bg-mist"}`}>
            {r.label}
          </Link>
        ))}
      </nav>
      <section aria-label="Ringkasan" className="rise grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="rounded-[1.5rem] bg-chalk p-5">
            <p className="text-sm text-ink-soft">{t.l}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{t.v}</p>
            <p className="text-xs text-ink-soft">{t.n}</p>
          </div>
        ))}
      </section>
      {multi ? (
        <section className="rise mt-5 rounded-[2rem] bg-chalk p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Perbandingan cabang</h2>
          <p className="mt-1 text-sm text-ink-soft">Pemain di beberapa cabang dihitung di setiap cabangnya.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b-2 border-mist text-left text-xs text-ink-soft">
                  <th className="py-2 pr-3">Cabang</th>
                  {shown.map((c) => <th key={c.key} className="px-2 text-right">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...a.branches, a.total].map((b) => (
                  <tr key={b.branchId ?? b.name} className={`border-b border-mist ${b === a.total ? "font-extrabold" : ""}`}>
                    <th scope="row" className="py-2 pr-3 text-left font-bold">{b.name}</th>
                    {shown.map((c) => {
                      const v = b[c.key] as number | null;
                      return <td key={c.key} className="px-2 text-right tabular-nums">{v === null ? "-" : c.fmt(v)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rise rounded-[2rem] bg-chalk p-5 text-pitch sm:p-6">
          <h2 className="text-lg font-extrabold text-ink">Pemain aktif, 6 bulan</h2>
          <AreaTrend className="mt-3" points={a.trend.map((t) => ({ label: short(t.month), value: t.activePlayers }))} max={maxP} ticks={[maxP / 2, maxP]} format={(n) => `${n} pemain`} caption="Pemain aktif per bulan" />
        </section>
        <section className="rise rounded-[2rem] bg-chalk p-5 text-turf sm:p-6">
          <h2 className="text-lg font-extrabold text-ink">Kehadiran latihan, 6 bulan</h2>
          <AreaTrend className="mt-3" points={a.trend.map((t) => ({ label: short(t.month), value: t.attendanceRate }))} max={100} ticks={[50, 100]} format={(n) => `${n}%`} caption="Kehadiran per bulan" />
        </section>
        {a.money ? (
          <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-6 lg:col-span-2">
            <h2 className="text-lg font-extrabold">Uang masuk dan keluar, 6 bulan</h2>
            <div className="mt-3 grid gap-5 md:grid-cols-2">
              <div className="text-pitch">
                <p className="text-sm font-bold text-ink-soft">Iuran masuk</p>
                <AreaTrend points={a.trend.map((t) => ({ label: short(t.month), value: t.collected }))} max={maxM} ticks={[maxM / 2, maxM]} format={juta} caption="Iuran masuk per bulan" />
              </div>
              <div className="text-flame">
                <p className="text-sm font-bold text-ink-soft">Pengeluaran</p>
                <AreaTrend points={a.trend.map((t) => ({ label: short(t.month), value: t.expenses }))} max={maxM} ticks={[maxM / 2, maxM]} format={juta} caption="Pengeluaran per bulan" />
              </div>
            </div>
            <Link href="/keuangan?tab=laporan" className="mt-3 inline-block text-sm font-bold underline decoration-pitch decoration-2 underline-offset-4">Laporan keuangan lengkap</Link>
          </section>
        ) : null}
        <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Pemain per program</h2>
          {a.programs.length ? <BarList className="mt-3" rows={a.programs.map((p) => ({ label: p.name, value: p.players }))} format={(n) => `${n} pemain`} /> : <p className="mt-2 text-sm text-ink-soft">Belum ada pemain di tim.</p>}
          <p className="mt-3 text-sm text-ink-soft">Pendaftar online 6 bulan: {a.trend.reduce((s, t) => s + t.registrations, 0)}</p>
        </section>
        <section className="rise rounded-[2rem] bg-chalk p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Perlu diperhatikan</h2>
          <p className="mt-1 text-sm text-ink-soft">Kehadiran di bawah 75% (minimal 3 sesi).</p>
          {a.topAbsent.length ? (
            <ul className="mt-3 grid gap-1">
              {a.topAbsent.map((p) => (
                <li key={p.playerId} className="flex justify-between gap-3 border-b border-mist py-2">
                  <Link href={`/pemain/${p.playerId}`} className="min-w-0 truncate font-bold hover:underline">{p.fullName}</Link>
                  <span className="shrink-0 font-bold text-flame tabular-nums">{p.rate}% dari {p.sessions}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-bold text-pitch">Semua pemain rajin hadir.</p>
          )}
        </section>
      </div>
    </div>
  );
}
