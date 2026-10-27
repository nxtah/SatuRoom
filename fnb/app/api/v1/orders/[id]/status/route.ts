import { NextResponse } from "next/server";
import { OrderStatusInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { updateOrderStatus } from "@/server/orders";
import { z } from "zod";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = z.string().uuid().parse((await params).id);
    const parsed = OrderStatusInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Status tidak valid." }, { status: 422 });
    await updateOrderStatus(await requireApiContext(), id, parsed.data.status);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const message =
      code === "FORBIDDEN" ? "Anda tidak punya izin mengubah pesanan."
      : code === "NOT_FOUND" ? "Pesanan tidak ditemukan."
      : code === "INVALID_TRANSITION" ? "Status pesanan tidak bisa dilompati."
      : "Status pesanan belum dapat diubah.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 422 });
  }
}
