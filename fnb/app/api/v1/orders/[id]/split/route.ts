import { NextResponse } from "next/server";
import { SplitOrderInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { splitOrder } from "@/server/tables";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => NextResponse.json(await splitOrder(ctx, id, (await body(req, SplitOrderInput)).lineIds), { status: 201 }));
