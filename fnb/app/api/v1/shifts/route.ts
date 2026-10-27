import { NextResponse } from "next/server";
import { ShiftOpenInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { currentShiftSummary, openShift } from "@/server/payments";

const fail = (e: unknown) => {
  const code = e instanceof Error ? e.message : "";
  const map: Record<string, [string, number]> = {
    FORBIDDEN: ["Anda tidak punya izin membuka kas.", 403],
    UNAUTHORIZED: ["Silakan masuk lagi.", 401],
    SHIFT_OPEN: ["Masih ada shift kas yang belum ditutup.", 409],
    NO_OUTLET: ["Outlet belum tersedia.", 422],
  };
  const [message, status] = map[code] ?? ["Kas belum dapat dibuka.", 422];
  return NextResponse.json({ error: message }, { status });
};

export async function GET() {
  try {
    return NextResponse.json(await currentShiftSummary(await requireApiContext()));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const parsed = ShiftOpenInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa nominal kas." }, { status: 422 });
    return NextResponse.json(await openShift(await requireApiContext(), parsed.data), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
