import { NextResponse } from "next/server";
import { CustomerInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveCustomer, getCustomer, updateCustomer } from "@/server/promos";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => {
  await updateCustomer(ctx, id, await body(req, CustomerInput));
  return NextResponse.json({ ok: true });
});
export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => {
  await archiveCustomer(ctx, id);
  return NextResponse.json({ ok: true });
});
export const GET = route<{ id: string }>(async (_req, ctx, { id }) => NextResponse.json(await getCustomer(ctx, id)));
