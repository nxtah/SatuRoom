import "server-only";
import { randomBytes } from "node:crypto";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { PublicRegistrationInput, RegistrationApproveInput, RegistrationRejectInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext, requireModule } from "./context";
import { db } from "./db";
import { AppError, notFound } from "./errors";
import { createPlayerIn } from "./players";

const newToken = () => randomBytes(18).toString("base64url");

export interface RegistrationLink {
  token: string;
  enabled: boolean;
}

export interface RegistrationRow {
  id: string;
  fullName: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  note: string | null;
  createdAt: string;
}

/** Link pendaftaran akademi ini; null bila belum pernah dibuat. */
export async function getRegistrationLink(ctx: AcademyContext): Promise<RegistrationLink | null> {
  requireModule(ctx, "registrations");
  requirePermission(ctx, "players.manage");
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`SELECT token, enabled FROM bola.registration_links`)) as unknown as RegistrationLink[];
    return row ?? null;
  });
}

/** Membuat link bila belum ada; `enabled` menyalakan/mematikan; `rotate` mengganti token (link lama mati). */
export async function updateRegistrationLink(
  ctx: AcademyContext,
  input: { enabled?: boolean; rotate?: boolean },
): Promise<RegistrationLink> {
  requireModule(ctx, "registrations");
  requirePermission(ctx, "players.manage");
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.registration_links (business_id, token)
      VALUES (${ctx.businessId}::uuid, ${newToken()})
      ON CONFLICT (business_id) DO UPDATE SET
        enabled = coalesce(${input.enabled ?? null}::boolean, bola.registration_links.enabled),
        token = CASE WHEN ${input.rotate === true} THEN ${newToken()} ELSE bola.registration_links.token END,
        rotated_at = CASE WHEN ${input.rotate === true} THEN now() ELSE bola.registration_links.rotated_at END
      RETURNING token, enabled`)) as unknown as RegistrationLink[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: input.rotate ? "registration_link.rotated" : "registration_link.updated",
      targetType: "registration_link",
      targetId: ctx.businessId,
      meta: { enabled: row!.enabled },
    });
    return row!;
  });
}

export async function listRegistrations(ctx: AcademyContext): Promise<RegistrationRow[]> {
  requireModule(ctx, "registrations");
  requirePermission(ctx, "players.manage");
  return inAcademy(ctx, async (tx) => {
    // Kontak wali hanya untuk peran dengan izin kontak, sama seperti data pemain.
    requirePermission(ctx, "guardians.read");
    return (await tx.execute(sql`
      SELECT id, full_name AS "fullName", to_char(birth_date, 'YYYY-MM-DD') AS "birthDate",
             guardian_name AS "guardianName", guardian_phone AS "guardianPhone", note,
             to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
      FROM bola.registrations WHERE status = 'pending' ORDER BY created_at LIMIT 200`)) as unknown as RegistrationRow[];
  });
}

export async function pendingRegistrationCount(ctx: AcademyContext): Promise<number> {
  if (!ctx.modules.has("registrations")) return 0;
  if (!ctx.can("players.manage") || !ctx.can("guardians.read")) return 0;
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`SELECT count(*)::int AS n FROM bola.registrations WHERE status = 'pending'`)) as unknown as { n: number }[];
    return row?.n ?? 0;
  });
}

/** Menyetujui = membuat pemain dari data pendaftar (kontak wali ikut), lalu menandai pendaftaran. Satu transaksi. */
export async function approveRegistration(
  ctx: AcademyContext,
  id: string,
  input: z.infer<typeof RegistrationApproveInput>,
): Promise<string> {
  requireModule(ctx, "registrations");
  requirePermission(ctx, "players.manage");
  requirePermission(ctx, "guardians.read");
  return inAcademy(ctx, async (tx) => {
    // Klaim dulu: dua admin yang menyetujui bersamaan tidak membuat dua pemain.
    const [reg] = (await tx.execute(sql`
      UPDATE bola.registrations SET status = 'approved', decided_by = ${ctx.userId}::uuid, decided_at = now()
      WHERE id = ${id}::uuid AND status = 'pending'
      RETURNING full_name AS "fullName", to_char(birth_date, 'YYYY-MM-DD') AS "birthDate",
                guardian_name AS "guardianName", guardian_phone AS "guardianPhone"`)) as unknown as {
      fullName: string; birthDate: string; guardianName: string; guardianPhone: string;
    }[];
    if (!reg) throw notFound("Pendaftar");
    const playerId = await createPlayerIn(ctx, tx, {
      fullName: reg.fullName,
      birthDate: reg.birthDate,
      teamIds: input.teamIds,
      guardianName: reg.guardianName,
      guardianPhone: reg.guardianPhone,
    });
    await tx.execute(sql`UPDATE bola.registrations SET player_id = ${playerId}::uuid WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "registration.approved",
      targetType: "registration",
      targetId: id,
      meta: { playerId },
    });
    return playerId;
  });
}

export async function rejectRegistration(
  ctx: AcademyContext,
  id: string,
  input: z.infer<typeof RegistrationRejectInput>,
): Promise<void> {
  requireModule(ctx, "registrations");
  requirePermission(ctx, "players.manage");
  await inAcademy(ctx, async (tx) => {
    const done = (await tx.execute(sql`
      UPDATE bola.registrations
      SET status = 'rejected', decided_by = ${ctx.userId}::uuid, decided_at = now(), reject_reason = ${input.reason ?? null}
      WHERE id = ${id}::uuid AND status = 'pending' RETURNING id`)) as unknown as unknown[];
    if (done.length === 0) throw notFound("Pendaftar");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "registration.rejected",
      targetType: "registration",
      targetId: id,
    });
  });
}

/** Nama akademi untuk halaman publik; null bila token salah atau link dimatikan. */
export async function publicRegistrationAcademy(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = (await withContext(db(), {}, (tx) =>
    tx.execute(sql`SELECT academy_name AS "name" FROM bola.registration_academy(${token})`),
  )) as unknown as { name: string }[];
  return row?.name ?? null;
}

export async function submitPublicRegistration(token: string, input: z.infer<typeof PublicRegistrationInput>): Promise<void> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw closed();
  const [row] = (await withContext(db(), {}, (tx) =>
    tx.execute(sql`
      SELECT bola.submit_registration(${token}, ${input.fullName}, ${input.birthDate}::date,
                                      ${input.guardianName}, ${input.guardianPhone}, ${input.note ?? null}) AS result`),
  )) as unknown as { result: "created" | "duplicate" | "closed" | "full" }[];
  switch (row?.result) {
    case "created":
    case "duplicate": // Jawaban sama agar pihak luar tidak bisa menebak data yang sudah masuk.
      return;
    case "full":
      throw new AppError(429, "full", "Antrean pendaftaran sedang penuh. Hubungi akademi langsung.");
    default:
      throw closed();
  }
}

const closed = () => new AppError(404, "closed", "Pendaftaran ini sudah ditutup. Hubungi akademi untuk link terbaru.");
