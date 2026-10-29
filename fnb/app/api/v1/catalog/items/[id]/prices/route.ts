import { NextResponse } from "next/server";
import { listPriceChanges } from "@/server/catalog";
import { route } from "@/server/http";

export const GET = route<{ id: string }>(async (_req, ctx, { id }) => NextResponse.json(await listPriceChanges(ctx, id)));
