import { NextResponse } from "next/server";
import { CustomRoleInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveCustomRole, updateCustomRole } from "@/server/roles";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => {
  await updateCustomRole(ctx, id, await body(req, CustomRoleInput));
  return NextResponse.json({ ok: true });
});
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveCustomRole(ctx, id);
  return NextResponse.json({ ok: true });
});
