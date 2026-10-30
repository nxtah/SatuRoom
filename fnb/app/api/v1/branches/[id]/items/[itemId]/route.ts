import { NextResponse } from "next/server";
import { OutletItemInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { saveOutletItem } from "@/server/outlet-items";

export const PUT = route<{ id: string; itemId: string }>(async (req, ctx, { id, itemId }) => { await saveOutletItem(ctx, id, itemId, await body(req, OutletItemInput)); return NextResponse.json({ ok: true }); });
