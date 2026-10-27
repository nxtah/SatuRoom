import { NextResponse } from "next/server";
import { LineStatusInput } from "@/lib/schemas";
import { requireApiContext } from "@/server/context";
import { updateLineStatus } from "@/server/orders";
import { env } from "@/server/env";
import { z } from "zod";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
      return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
    }
    const id = z.string().uuid().parse((await params).id);
    const parsed = LineStatusInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Status tidak valid." }, { status: 422 });
    await updateLineStatus(await requireApiContext(), id, parsed.data.status);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const message = code === "FORBIDDEN" ? "Hanya dapur yang bisa mengubah status masakan." : "Status masakan belum dapat diubah.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : 422 });
  }
}
