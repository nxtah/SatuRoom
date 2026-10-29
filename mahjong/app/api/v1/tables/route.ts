import { TableInput } from "@/lib/schemas";
import { requirePermission, venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createTable, listTables } from "@/server/tables";

export const GET = route(async () => {
  const ctx = await venueContext();
  requirePermission(ctx, "floor.view");
  return ok({ tables: await listTables(ctx) });
});

export const POST = route(async (req) => ok({ id: await createTable(await venueContext(), await body(req, TableInput)) }, 201));
