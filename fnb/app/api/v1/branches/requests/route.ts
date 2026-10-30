import { NextResponse } from "next/server";
import { BranchRequestInput } from "@/lib/schemas";
import { requestBranch } from "@/server/branches";
import { body, route } from "@/server/http";

export const POST = route(async (req, ctx) => NextResponse.json(await requestBranch(ctx, await body(req, BranchRequestInput)), { status: 201 }));
