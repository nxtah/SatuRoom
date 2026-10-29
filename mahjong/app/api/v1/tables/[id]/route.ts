import { TableInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { archiveTable, updateTable } from "@/server/tables";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateTable(await venueContext(), await routeId(ctx, "Meja"), await body(req, TableInput));
  return noContent();
});

/** Mengarsipkan meja (bukan menghapus permanen). */
export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveTable(await venueContext(), await routeId(ctx, "Meja"));
  return noContent();
});
