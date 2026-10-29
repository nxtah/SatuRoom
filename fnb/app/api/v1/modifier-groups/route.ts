import { NextResponse } from "next/server";
import { ModifierGroupInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { listModifierGroups, saveModifierGroup } from "@/server/modifiers";

export const GET = route(async (_req, ctx) => NextResponse.json(await listModifierGroups(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await saveModifierGroup(ctx, await body(req, ModifierGroupInput)), { status: 201 }));
