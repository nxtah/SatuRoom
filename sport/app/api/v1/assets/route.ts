import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { AssetInput, createAsset } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createAsset(ctx, await body(req, AssetInput)) }, 201);
});
