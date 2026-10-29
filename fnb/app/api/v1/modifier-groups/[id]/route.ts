import { NextResponse } from "next/server";
import { ModifierGroupInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveModifierGroup, saveModifierGroup } from "@/server/modifiers";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => NextResponse.json(await saveModifierGroup(ctx, { ...(await body(req, ModifierGroupInput)), id })));
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveModifierGroup(ctx, id);
  return NextResponse.json({ ok: true });
});
