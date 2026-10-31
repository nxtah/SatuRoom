import { AccountInput } from "@/lib/schemas";
import { createAccount, listAccounts } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const GET = route(async () => ok(await listAccounts(await academyContext())));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createAccount(ctx, await body(req, AccountInput)) }, 201);
});
