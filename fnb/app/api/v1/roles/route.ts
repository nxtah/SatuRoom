import { NextResponse } from "next/server";
import { CustomRoleInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createCustomRole, listCustomRoles } from "@/server/roles";

export const GET = route(async (_req, ctx) => NextResponse.json(await listCustomRoles(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await createCustomRole(ctx, await body(req, CustomRoleInput)), { status: 201 }));
