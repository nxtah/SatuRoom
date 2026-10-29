import { NextResponse } from "next/server";
import { VoucherActiveInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveVoucher, setVoucherActive } from "@/server/promos";

export const PATCH = route<{ id: string }>(async (req, ctx, { id }) => {
  await setVoucherActive(ctx, id, (await body(req, VoucherActiveInput)).active);
  return NextResponse.json({ ok: true });
});
export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => {
  await archiveVoucher(ctx, id);
  return NextResponse.json({ ok: true });
});
