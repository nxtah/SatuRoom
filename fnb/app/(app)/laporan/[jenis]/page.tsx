import { notFound, redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import { buildReport, isReportSlug, listCashiers, parseFilter, REPORTS, type Col, type Row } from "@/server/report-center";
import { todayJakarta } from "@/server/reports";
import { requireFnbPage } from "@/server/routing";

const fmt = (v: Row[string], kind: Col["kind"]) => {
  if (v === null || v === undefined || v === "") return "-";
  if (kind === "text" || typeof v === "string") return String(v);
  if (kind === "money") return `${v < 0 ? "-" : ""}Rp${Math.abs(v).toLocaleString("id-ID")}`;
  if (kind === "pct") return `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  return v.toLocaleString("id-ID", { maximumFractionDigits: kind === "num" ? 3 : 0 });
};
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export default async function DetailReportPage({ params, searchParams }: { params: Promise<{ jenis: string }>; searchParams: Promise<{ dari?: string; sampai?: string; kasir?: string }> }) {
  const ctx = await requireFnbPage();
  if (!can(ctx, "reports.read")) redirect("/");
  const { jenis } = await params;
  if (!isReportSlug(jenis)) notFound();
  const q = await searchParams;
  const today = todayJakarta();
  let f;
  try { f = parseFilter(q, today); } catch { f = parseFilter({}, today); }
  const [report, cashiers] = await Promise.all([buildReport(ctx, jenis, f), listCashiers(ctx)]);
  const meta = REPORTS.find((r) => r.slug === jenis)!;
  const qs = (a: string, b: string) => `?dari=${a}&sampai=${b}${f.cashierId ? `&kasir=${f.cashierId}` : ""}`;
  const month = today.slice(0, 8) + "01";
  const prevEnd = addDays(month, -1);
  const presets = [["Hari ini", today, today], ["Kemarin", addDays(today, -1), addDays(today, -1)], ["7 hari", addDays(today, -6), today], ["Bulan ini", month, today], ["Bulan lalu", prevEnd.slice(0, 8) + "01", prevEnd]] as const;
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <PageHead kicker="Laporan" title={meta.title}>{meta.hint}</PageHead>
    <form className="mt-5 flex flex-wrap items-end gap-3 rounded-[1.6rem] bg-white p-4">
      <label className="grid gap-1 text-sm font-bold">Dari<input type="date" name="dari" defaultValue={f.from} max={today} className="h-11 rounded-xl border border-stone-300 px-3" /></label>
      <label className="grid gap-1 text-sm font-bold">Sampai<input type="date" name="sampai" defaultValue={f.to} max={today} className="h-11 rounded-xl border border-stone-300 px-3" /></label>
      <label className="grid gap-1 text-sm font-bold">Kasir<select name="kasir" defaultValue={f.cashierId ?? ""} className="h-11 rounded-xl border border-stone-300 bg-white px-3"><option value="">Semua kasir</option>{cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <button className="h-11 rounded-full bg-kitchen px-5 font-bold text-white">Terapkan</button>
      <a href={`/api/v1/reports/detail/${jenis}${qs(f.from, f.to)}&format=csv`} className="inline-flex h-11 items-center rounded-full bg-saffron px-5 font-extrabold text-kitchen">Unduh CSV</a>
    </form>
    <div className="mt-3 flex flex-wrap gap-2">{presets.map(([label, a, b]) => <a key={label} href={qs(a, b)} aria-current={f.from === a && f.to === b ? "true" : undefined} className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-bold ${f.from === a && f.to === b ? "bg-kitchen text-white" : "bg-white"}`}>{label}</a>)}</div>

    <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {report.summary.map((s) => <div key={s.label} className="rounded-[1.4rem] bg-kitchen p-4 text-white"><dt className="text-xs text-white/70">{s.label}</dt><dd className="mt-1 text-lg font-extrabold tabular-nums sm:text-xl">{fmt(s.value, s.kind)}</dd></div>)}
    </dl>
    {report.truncated ? <p className="mt-3 rounded-2xl bg-saffron/25 p-3 text-sm font-bold">Hanya 1.000 baris terbaru ditampilkan. Persempit tanggal atau unduh CSV.</p> : null}

    {report.sections.map((sec) => <section key={sec.title} className="mt-5 rounded-[2rem] bg-white p-4 sm:p-6">
      <h2 className="text-xl font-extrabold">{sec.title} <span className="text-sm font-normal text-stone-500">· {sec.rows.length} baris</span></h2>
      {sec.note ? <p className="mt-1 text-sm text-stone-600">{sec.note}</p> : null}
      {sec.rows.length ? <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead><tr className="border-b border-stone-200 text-left text-stone-600">{sec.columns.map((c) => <th key={c.key} scope="col" className={`px-3 py-2 font-bold whitespace-nowrap ${c.kind === "text" ? "" : "text-right"}`}>{c.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone-100">{sec.rows.map((r, i) => <tr key={i}>{sec.columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.kind === "text" ? "max-w-72" : "text-right tabular-nums whitespace-nowrap"}`}>{fmt(r[c.key], c.kind)}</td>)}</tr>)}</tbody>
          {sec.totals ? <tfoot><tr className="border-t-2 border-stone-300 font-extrabold">{sec.columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.kind === "text" ? "" : "text-right tabular-nums whitespace-nowrap"}`}>{sec.totals![c.key] === undefined ? "" : fmt(sec.totals![c.key], c.kind)}</td>)}</tr></tfoot> : null}
        </table>
      </div> : <p className="py-8 text-center text-stone-500">Tidak ada data pada rentang ini.</p>}
    </section>)}
  </main>;
}
