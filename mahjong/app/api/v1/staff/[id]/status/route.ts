import { StaffStatusInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setStaffStatus } from "@/server/staff";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  await setStaffStatus(await venueContext(), await routeId(ctx, "Staf"), (await body(req, StaffStatusInput)).status);
  return noContent();
});
