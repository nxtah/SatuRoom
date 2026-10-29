import { StaffUpdateInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { updateStaff } from "@/server/staff";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateStaff(await venueContext(), await routeId(ctx, "Staf"), await body(req, StaffUpdateInput));
  return noContent();
});
