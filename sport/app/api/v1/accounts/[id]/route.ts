import { AccountInput } from "@/lib/schemas";
import { archiveAccount, updateAccount } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  await updateAccount(await academyContext(), await routeId(ctx, "Akun"), await body(req, AccountInput.pick({ code: true, name: true })));
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveAccount(await academyContext(), await routeId(ctx, "Akun"));
  return noContent();
});
