import { requireSession, venueContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { ok, route } from "@/server/http";
import { PERMISSIONS, ROLE_LABEL } from "@/server/permissions";

/** Siapa saya, tempat aktif, peran, dan izin (untuk menyesuaikan tampilan; server tetap memeriksa). */
export const GET = route(async () => {
  const session = await requireSession();
  let venue = null;
  try {
    const ctx = await venueContext();
    venue = { id: ctx.businessId, roles: ctx.roles.map((r) => ({ id: r, label: ROLE_LABEL[r] })), permissions: PERMISSIONS.filter((p) => ctx.can(p)) };
  } catch (error) {
    if (!(error instanceof AppError && error.code === "no_venue")) throw error;
  }
  return ok({ user: { id: session.userId, name: session.name, email: session.email }, venue });
});
