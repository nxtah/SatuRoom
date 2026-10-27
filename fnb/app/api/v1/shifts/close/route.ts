import { NextResponse } from "next/server";
import { ShiftCloseInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { closeShift } from "@/server/payments";

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = ShiftCloseInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa nominal kas." }, { status: 422 });
    return NextResponse.json(await closeShift(await requireApiContext(), parsed.data));
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const message =
      code === "FORBIDDEN" ? "Anda tidak punya izin menutup kas."
      : code === "NO_SHIFT" ? "Tidak ada shift kas yang terbuka."
      : "Kas belum dapat ditutup.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NO_SHIFT" ? 409 : 422 });
  }
}
