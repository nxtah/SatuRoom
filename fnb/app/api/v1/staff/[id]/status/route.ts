import { NextResponse } from "next/server";
import { StaffStatusInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { setStaffStatus } from "@/server/staff";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => {
  await setStaffStatus(ctx, id, (await body(req, StaffStatusInput)).status);
  return NextResponse.json({ ok: true });
});
