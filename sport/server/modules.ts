import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import { MODULES, MODULE_KEYS, effectiveModules, type ModuleKey } from "@/lib/modules";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError } from "./errors";
import { academyModules } from "./schema";

export interface ModuleState {
  key: ModuleKey;
  label: string;
  hint: string;
  requires: string[];
  /** Pilihan pemilik. */
  enabled: boolean;
  /** Menyala sungguhan (mati bila modul yang dibutuhkan mati). */
  active: boolean;
}

export async function listModules(ctx: AcademyContext): Promise<ModuleState[]> {
  requirePermission(ctx, "modules.manage");
  const disabled = await inAcademy(ctx, async (tx) =>
    (await tx.select({ module: academyModules.module, enabled: academyModules.enabled }).from(academyModules))
      .filter((r) => !r.enabled)
      .map((r) => r.module),
  );
  const on = effectiveModules(disabled);
  return MODULES.map((m) => ({ key: m.key, label: m.label, hint: m.hint, requires: [...m.requires], enabled: !disabled.includes(m.key), active: on.has(m.key) }));
}

/** Menyalakan/mematikan modul. Data modul tidak dihapus; mematikan hanya menyembunyikan dan mengunci aksinya. */
export async function setModule(ctx: AcademyContext, key: string, enabled: boolean): Promise<void> {
  requirePermission(ctx, "modules.manage");
  if (!MODULE_KEYS.includes(key as ModuleKey)) throw new AppError(422, "invalid", "Modul tidak dikenal.");
  await inAcademy(ctx, async (tx) => {
    await tx
      .insert(academyModules)
      .values({ businessId: ctx.businessId, module: key, enabled })
      .onConflictDoUpdate({ target: [academyModules.businessId, academyModules.module], set: { enabled, updatedAt: new Date() } });
    // Link pendaftaran publik ikut ditutup saat modulnya dimatikan.
    if (key === "registrations" && !enabled) await tx.execute(sql`UPDATE bola.registration_links SET enabled = false`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: enabled ? "module.enabled" : "module.disabled",
      targetType: "module",
      targetId: key,
    });
  });
}
