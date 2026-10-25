import { academyContext, requireSession } from "@/server/context";
import { AppError } from "@/server/errors";
import { ok, route } from "@/server/http";
import { ROLE_LABEL, PERMISSIONS } from "@/server/permissions";

/** Siapa saya, akademi aktif, peran, dan izin (untuk menyesuaikan tampilan; server tetap memeriksa). */
export const GET = route(async () => {
  const session = await requireSession();
  let academy = null;
  try {
    const ctx = await academyContext();
    academy = {
      id: ctx.businessId,
      roles: ctx.roles.map((r) => ({ id: r, label: ROLE_LABEL[r] })),
      permissions: PERMISSIONS.filter((p) => ctx.can(p)),
    };
  } catch (error) {
    if (!(error instanceof AppError && error.code === "no_academy")) throw error;
  }
  return ok({ user: { id: session.userId, name: session.name, email: session.email }, academy });
});
