import { StaffRequestInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createStaffRequest } from "@/server/staff-attendance";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createStaffRequest(ctx, await body(req, StaffRequestInput)) }, 201);
});
