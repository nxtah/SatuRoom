import { NextResponse } from "next/server";
import { MergeOrderInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { mergeOrders } from "@/server/tables";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => NextResponse.json(await mergeOrders(ctx, id, (await body(req, MergeOrderInput)).targetId)));
