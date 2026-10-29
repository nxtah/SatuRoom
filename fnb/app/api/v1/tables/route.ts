import { NextResponse } from "next/server";
import { TableInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createTable, listTables } from "@/server/tables";

export const GET = route(async (_req, ctx) => NextResponse.json(await listTables(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await createTable(ctx, await body(req, TableInput)), { status: 201 }));
