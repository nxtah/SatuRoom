import { NextResponse } from "next/server";
import { requireApiContext } from "@/server/context";
import { dailyReport, todayJakarta } from "@/server/reports";

export async function GET(req: Request) {
  try {
    const date = new URL(req.url).searchParams.get("tanggal") ?? todayJakarta();
    return NextResponse.json(await dailyReport(await requireApiContext(), date));
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const map: Record<string, [string, number]> = {
      FORBIDDEN: ["Anda tidak punya izin melihat laporan.", 403],
      UNAUTHORIZED: ["Silakan masuk lagi.", 401],
      INVALID_DATE: ["Tanggal tidak valid.", 422],
    };
    const [message, status] = map[code] ?? ["Laporan belum dapat dimuat.", 422];
    return NextResponse.json({ error: message }, { status });
  }
}
