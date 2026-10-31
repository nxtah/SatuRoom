import { StaffRequestDecisionInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { cancelStaffRequest, decideStaffRequest } from "@/server/staff-attendance";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  await decideStaffRequest(await academyContext(), await routeId(ctx, "Pengajuan"), await body(req, StaffRequestDecisionInput));
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await cancelStaffRequest(await academyContext(), await routeId(ctx, "Pengajuan"));
  return noContent();
});
