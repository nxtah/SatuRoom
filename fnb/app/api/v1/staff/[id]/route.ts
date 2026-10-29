import { NextResponse } from "next/server";
import { StaffRolesInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { updateStaffRoles } from "@/server/staff";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => {
  await updateStaffRoles(ctx, id, await body(req, StaffRolesInput));
  return NextResponse.json({ ok: true });
});
