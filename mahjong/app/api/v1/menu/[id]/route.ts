import { MenuInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { archiveMenuItem, updateMenuItem } from "@/server/menu";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateMenuItem(await venueContext(), await routeId(ctx, "Menu"), await body(req, MenuInput));
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveMenuItem(await venueContext(), await routeId(ctx, "Menu"));
  return noContent();
});
