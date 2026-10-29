import { NextResponse } from "next/server";
import { z } from "zod";
import { StockCountInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { countStock } from "@/server/stock";

const fail = (e: unknown) => {
  const code = e instanceof Error ? e.message : "";
  const map: Record<string, [string, number]> = {
    FORBIDDEN: ["Anda tidak punya izin mengelola stok.", 403],
    UNAUTHORIZED: ["Silakan masuk lagi.", 401],
    NOT_FOUND: ["Bahan tidak ditemukan.", 404],
    BELOW_ZERO: ["Stok tidak boleh kurang dari nol.", 409],
  };
  const [message, status] = map[code] ?? ["Stok belum dapat diubah.", 422];
  return NextResponse.json({ error: message }, { status });
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const id = z.string().uuid().safeParse((await params).id);
    if (!id.success) return NextResponse.json({ error: "Bahan tidak ditemukan." }, { status: 404 });
    const parsed = StockCountInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa hasil hitung." }, { status: 422 });
    return NextResponse.json(await countStock(await requireApiContext(), id.data, parsed.data));
  } catch (e) {
    return fail(e);
  }
}
