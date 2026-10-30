import { logout } from "@saturoom/core/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieName } from "@/server/context";
import { db } from "@/server/db";
import { env } from "@/server/env";

export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(env().APP_URL).origin) return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (token) await logout(db(), token);
  jar.delete(cookieName());
  return NextResponse.json({ ok: true });
}
