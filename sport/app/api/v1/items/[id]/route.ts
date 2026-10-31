import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { ItemInput, archiveItem, saveItem, stockCard } from "@/server/inventory";

export const PUT = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Barang");
  await saveItem(ctx, id, await body(req, ItemInput));
  return noContent();
});

export const DELETE = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Barang");
  void req;
  await archiveItem(ctx, id);
  return noContent();
});

export const GET = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Barang");
  void req;
  return ok(await stockCard(ctx, id));
});
