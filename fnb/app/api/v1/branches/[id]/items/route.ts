import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { listOutletItems } from "@/server/outlet-items";

export const GET = route<{ id: string }>(async (_req, ctx, { id }) => NextResponse.json(await listOutletItems(ctx, id)));
