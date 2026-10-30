import { NextResponse } from "next/server";
import { TableGroupInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveTableGroup, saveTableGroup } from "@/server/table-groups";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => NextResponse.json(await saveTableGroup(ctx, await body(req, TableGroupInput), id)));
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveTableGroup(ctx, id);
  return NextResponse.json({ ok: true });
});
