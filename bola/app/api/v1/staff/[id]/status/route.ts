import { StaffStatusInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setStaffStatus } from "@/server/staff";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  const { status } = await body(req, StaffStatusInput);
  await setStaffStatus(await academyContext(), await routeId(ctx, "Staf"), status);
  return noContent();
});
