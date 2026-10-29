import { NextResponse } from "next/server";
import { ItemGroupsInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { setItemGroups } from "@/server/modifiers";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => {
  await setItemGroups(ctx, id, await body(req, ItemGroupsInput));
  return NextResponse.json({ ok: true });
});
