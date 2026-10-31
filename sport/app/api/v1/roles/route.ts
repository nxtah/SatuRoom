import { CustomRoleInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createCustomRole, listCustomRoles } from "@/server/roles";

export const GET = route(async () => ok(await listCustomRoles(await academyContext())));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createCustomRole(ctx, await body(req, CustomRoleInput)) }, 201);
});
