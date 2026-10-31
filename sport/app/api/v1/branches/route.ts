import { BranchInput } from "@/lib/schemas";
import { createBranch, listBranches } from "@/server/branches";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const GET = route(async () => ok(await listBranches(await academyContext())));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createBranch(ctx, await body(req, BranchInput)) }, 201);
});
