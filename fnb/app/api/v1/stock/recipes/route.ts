import { NextResponse } from "next/server";
import { RecipeInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { setRecipe } from "@/server/stock";

const fail = (e: unknown) => {
  const code = e instanceof Error ? e.message : "";
  const map: Record<string, [string, number]> = {
    FORBIDDEN: ["Anda tidak punya izin mengelola stok.", 403],
    UNAUTHORIZED: ["Silakan masuk lagi.", 401],
    NOT_FOUND: ["Menu tidak ditemukan.", 404],
  };
  const [message, status] = map[code] ?? ["Resep belum dapat disimpan.", 422];
  return NextResponse.json({ error: message }, { status });
};

export async function PUT(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = RecipeInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa resep." }, { status: 422 });
    const ids = parsed.data.lines.map((l) => l.ingredientId);
    if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Bahan yang sama tidak boleh dua kali." }, { status: 422 });
    await setRecipe(await requireApiContext(), parsed.data);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
