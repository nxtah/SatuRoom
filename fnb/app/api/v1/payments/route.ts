import { NextResponse } from "next/server";
import { PaymentInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { payOrder } from "@/server/payments";

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = PaymentInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa pembayaran." }, { status: 422 });
    return NextResponse.json(await payOrder(await requireApiContext(), parsed.data), { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const message =
      code === "FORBIDDEN" ? "Anda tidak punya izin menerima pembayaran."
      : code === "NOT_FOUND" ? "Pesanan tidak ditemukan."
      : code === "ORDER_NOT_READY" ? "Pesanan ini belum siap dibayar."
      : "Pembayaran belum dapat disimpan.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 422 });
  }
}
