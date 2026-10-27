import { NextResponse } from "next/server";
import { OrderInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { createOrder, listOrders } from "@/server/orders";

const fail = (e: unknown) => {
  const code = e instanceof Error ? e.message : "";
  const map: Record<string, [string, number]> = {
    FORBIDDEN: ["Anda tidak punya izin membuat pesanan.", 403],
    UNAUTHORIZED: ["Silakan masuk lagi.", 401],
    NOT_FOUND: ["Menu tidak ditemukan.", 404],
    ITEM_UNAVAILABLE: ["Ada menu yang sedang habis.", 422],
    INSUFFICIENT_STOCK: ["Bahan tidak cukup untuk pesanan ini.", 409],
    NO_OUTLET: ["Outlet belum tersedia.", 422],
  };
  const [message, status] = map[code] ?? ["Pesanan belum dapat disimpan.", 422];
  return NextResponse.json({ error: message }, { status });
};

export async function GET(req: Request) {
  try {
    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "active";
    return NextResponse.json(await listOrders(await requireApiContext(), scope));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = OrderInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa pesanan." }, { status: 422 });
    return NextResponse.json(await createOrder(await requireApiContext(), parsed.data), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
