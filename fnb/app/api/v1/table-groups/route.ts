import { NextResponse } from "next/server";
import { TableGroupInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { listTableGroups, saveTableGroup } from "@/server/table-groups";

export const GET = route(async (_req, ctx) => NextResponse.json(await listTableGroups(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await saveTableGroup(ctx, await body(req, TableGroupInput)), { status: 201 }));
