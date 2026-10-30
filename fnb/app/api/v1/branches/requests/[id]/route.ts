import { NextResponse } from "next/server";
import { cancelBranchRequest } from "@/server/branches";
import { route } from "@/server/http";

export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => { await cancelBranchRequest(ctx, id); return NextResponse.json({ ok: true }); });
