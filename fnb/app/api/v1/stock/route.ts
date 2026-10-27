import { NextResponse } from "next/server";
import { requireApiContext } from "@/server/context";
import { listStock } from "@/server/stock";

export async function GET() {
  try {
    return NextResponse.json(await listStock(await requireApiContext()));
  } catch (e) {
    const unauthorized = e instanceof Error && e.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Silakan masuk lagi." : "Stok belum dapat dimuat." }, { status: unauthorized ? 401 : 422 });
  }
}
