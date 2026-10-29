import { logout } from "@saturoom/core/auth";
import { cookies } from "next/headers";
import { sessionCookieName } from "@/server/context";
import { db } from "@/server/db";
import { clearSessionCookie, noContent, route } from "@/server/http";

export const POST = route(async () => {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (token) await logout(db(), token);
  await clearSessionCookie();
  return noContent();
});
