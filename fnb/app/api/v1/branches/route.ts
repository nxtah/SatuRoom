import { NextResponse } from "next/server";
import { BranchInput } from "@/lib/schemas";
import { branchOverview, createBranch } from "@/server/branches";
import { body, route } from "@/server/http";

export const GET = route(async (_req, ctx) => NextResponse.json(await branchOverview(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await createBranch(ctx, await body(req, BranchInput)), { status: 201 }));
