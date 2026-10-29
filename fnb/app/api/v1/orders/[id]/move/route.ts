import { NextResponse } from "next/server";
import { MoveOrderInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { moveOrder } from "@/server/tables";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  await moveOrder(ctx, id, (await body(req, MoveOrderInput)).tableId);
  return NextResponse.json({ ok: true });
});
