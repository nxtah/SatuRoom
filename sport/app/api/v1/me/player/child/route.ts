import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { notFound } from "@/server/errors";
import { CHILD_COOKIE, myChildren } from "@/server/player-account";

/** Orang tua memilih anak yang sedang dilihat di portal. Hanya anak yang terhubung ke akunnya. */
export const PUT = route(async (req) => {
  const session = await requireSession();
  const { playerId } = await body(req, z.object({ playerId: z.string().uuid() }));
  if (!(await myChildren(session.userId)).some((k) => k.playerId === playerId)) throw notFound("Pemain");
  (await cookies()).set(CHILD_COOKIE, playerId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return noContent();
});
