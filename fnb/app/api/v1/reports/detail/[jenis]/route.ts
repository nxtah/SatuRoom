import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { buildReport, isReportSlug, parseFilter, reportCsv } from "@/server/report-center";
import { todayJakarta } from "@/server/reports";

export const GET = route<{ jenis: string }>(async (req, ctx, { jenis }) => {
  if (!isReportSlug(jenis)) throw new AppError(404, "not_found", "Laporan tidak ditemukan.");
  const q = new URL(req.url).searchParams;
  const f = parseFilter({ dari: q.get("dari"), sampai: q.get("sampai"), kasir: q.get("kasir") }, todayJakarta());
  return new Response(reportCsv(await buildReport(ctx, jenis, f)), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${jenis}-${f.from}_${f.to}.csv"`, "cache-control": "no-store" },
  });
});
