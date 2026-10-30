import { NextResponse } from "next/server";
import { clientIp, withinLimit } from "@/server/rate-limit";
import { publicMenu } from "@/server/public-menu";

/** Tanpa login. Dibatasi per alamat supaya tidak dipakai membanjiri database; tidak disimpan di cache agar menu selalu terbaru. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!withinLimit(`menu:${clientIp(req)}`, 120, 60_000)) return NextResponse.json({ error: "Terlalu sering. Coba sebentar lagi." }, { status: 429 });
  const menu = await publicMenu((await params).code);
  if (!menu) return NextResponse.json({ error: "Menu tidak ditemukan." }, { status: 404 });
  return NextResponse.json(menu, { headers: { "cache-control": "no-store" } });
}
