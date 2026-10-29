import { NextResponse } from "next/server";
import { TableInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveTable, updateTable } from "@/server/tables";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => {
  await updateTable(ctx, id, await body(req, TableInput));
  return NextResponse.json({ ok: true });
});
export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => {
  await archiveTable(ctx, id);
  return NextResponse.json({ ok: true });
});
