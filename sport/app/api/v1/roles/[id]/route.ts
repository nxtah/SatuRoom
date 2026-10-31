import { CustomRoleInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { archiveCustomRole, updateCustomRole } from "@/server/roles";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  await updateCustomRole(await academyContext(), await routeId(ctx, "Peran"), await body(req, CustomRoleInput));
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveCustomRole(await academyContext(), await routeId(ctx, "Peran"));
  return noContent();
});
