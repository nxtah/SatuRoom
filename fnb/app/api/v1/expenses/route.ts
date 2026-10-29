import { NextResponse } from "next/server";
import { ExpenseInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createExpense, listExpenses } from "@/server/expenses";

export const GET = route(async (req, ctx) => NextResponse.json(await listExpenses(ctx, new URL(req.url).searchParams.get("bulan") ?? undefined)));
export const POST = route(async (req, ctx) => NextResponse.json(await createExpense(ctx, await body(req, ExpenseInput)), { status: 201 }));
