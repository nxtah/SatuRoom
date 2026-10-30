import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { getTransaction } from "@/server/transactions";

export const GET = route<{ id: string }>(async (_req, ctx, { id }) => NextResponse.json(await getTransaction(ctx, id)));
