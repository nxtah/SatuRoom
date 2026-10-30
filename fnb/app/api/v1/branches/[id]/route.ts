import { NextResponse } from "next/server";
import { BranchInput } from "@/lib/schemas";
import { archiveBranch, updateBranch } from "@/server/branches";
import { body, route } from "@/server/http";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => { await updateBranch(ctx, id, await body(req, BranchInput)); return NextResponse.json({ ok: true }); });
export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => { await archiveBranch(ctx, id); return NextResponse.json({ ok: true }); });
