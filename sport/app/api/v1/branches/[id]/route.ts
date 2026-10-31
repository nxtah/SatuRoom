import { BranchInput } from "@/lib/schemas";
import { archiveBranch, updateBranch } from "@/server/branches";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  await updateBranch(await academyContext(), await routeId(ctx, "Cabang"), await body(req, BranchInput));
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveBranch(await academyContext(), await routeId(ctx, "Cabang"));
  return noContent();
});
