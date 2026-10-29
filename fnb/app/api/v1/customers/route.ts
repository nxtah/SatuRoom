import { NextResponse } from "next/server";
import { CustomerInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createCustomer, listCustomers } from "@/server/promos";

export const GET = route(async (req, ctx) => NextResponse.json(await listCustomers(ctx, new URL(req.url).searchParams.get("q") ?? undefined)));
export const POST = route(async (req, ctx) => NextResponse.json(await createCustomer(ctx, await body(req, CustomerInput)), { status: 201 }));
