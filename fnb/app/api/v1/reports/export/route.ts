import { route } from "@/server/http";
import { salesCsv } from "@/server/exports";
import { todayJakarta } from "@/server/reports";

export const GET = route(async (req, ctx) => {
  const q = new URL(req.url).searchParams;
  const to = q.get("sampai") ?? todayJakarta();
  const from = q.get("dari") ?? to;
  return new Response(await salesCsv(ctx, from, to), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="penjualan-${from}_${to}.csv"`, "cache-control": "no-store" },
  });
});
