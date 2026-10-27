import { NextResponse } from "next/server";
import { IngredientInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { createIngredient } from "@/server/stock";

const fail = (e: unknown) => {
  const code = e instanceof Error ? e.message : "";
  const map: Record<string, [string, number]> = {
    FORBIDDEN: ["Anda tidak punya izin mengelola stok.", 403],
    UNAUTHORIZED: ["Silakan masuk lagi.", 401],
    NO_OUTLET: ["Outlet belum tersedia.", 422],
  };
  const [message, status] = map[code] ?? ["Bahan belum dapat disimpan.", 422];
  return NextResponse.json({ error: message }, { status });
};

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = IngredientInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa data bahan." }, { status: 422 });
    return NextResponse.json(await createIngredient(await requireApiContext(), parsed.data), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
