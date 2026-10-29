import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { listStaff } from "@/server/staff";

export const GET = route(async (_req, ctx) => NextResponse.json(await listStaff(ctx)));
