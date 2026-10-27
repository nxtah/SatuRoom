import { NextResponse } from "next/server";
import { PurchaseInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { recordPurchase } from "@/server/purchases";

const fail = (e: unknown) => {
  const code = e instanceof Error ? e.message : "";
  const map: Record<string, [string, number]> = {
    FORBIDDEN: ["Anda tidak punya izin mengelola pembelian.", 403],
    UNAUTHORIZED: ["Silakan masuk lagi.", 401],
    NOT_FOUND: ["Bahan atau supplier tidak ditemukan.", 404],
    DUPLICATE: ["Nama supplier sudah ada.", 409],
  };
  const [message, status] = map[code] ?? ["Pembelian belum dapat disimpan.", 422];
  return NextResponse.json({ error: message }, { status });
};

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = PurchaseInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa isian." }, { status: 422 });
    return NextResponse.json(await recordPurchase(await requireApiContext(), parsed.data), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
