import { NextResponse } from "next/server";
import { VoidPaymentInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { voidPayment } from "@/server/payments";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const id = z.string().uuid().parse((await params).id);
    const parsed = VoidPaymentInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Alasan wajib diisi." }, { status: 422 });
    await voidPayment(await requireApiContext(), id, parsed.data);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const message =
      code === "FORBIDDEN" ? "Hanya pemilik, manajer, atau akuntansi yang bisa membatalkan pembayaran."
      : code === "NOT_FOUND" ? "Pembayaran tidak ditemukan."
      : "Pembayaran belum dapat dibatalkan.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 422 });
  }
}
