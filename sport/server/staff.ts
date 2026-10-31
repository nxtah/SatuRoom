import "server-only";
import { isEmailVerified, setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents, memberships, users } from "@saturoom/core/schema";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import type { InviteInput, StaffUpdateInput } from "@/lib/schemas";
import { getAcademy } from "./academy";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound, unverifiedEmail } from "./errors";
import { sendStaffInvite } from "./mail";
import { formatBusinessCode } from "@/lib/business-code";
import { ROLE_LABEL, ROLES, type Role } from "./permissions";
import { assertCanGrant } from "./roles";
import { customRoles, invitations, staffCustomRoles, staffRoles, teamCoaches, teams } from "./schema";

export interface StaffMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  status: "active" | "suspended" | "removed";
  roles: Role[];
  customRoles: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}

export interface PendingInvite {
  id: string;
  email: string;
  roles: Role[];
  customRoleNames: string[];
  expiresAt: Date;
}

const byRank = (a: Role, b: Role) => ROLES.indexOf(a) - ROLES.indexOf(b);
export const roleLabels = (roles: Role[], custom: string[] = []) =>
  [...[...roles].sort(byRank).map((r) => ROLE_LABEL[r]), ...custom].join(", ") || "Anggota";

export async function listStaff(ctx: AcademyContext): Promise<{ members: StaffMember[]; invites: PendingInvite[] }> {
  requirePermission(ctx, "staff.read");
  return inAcademy(ctx, async (tx) => {
    const rows = await tx
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.businessId, ctx.businessId), ne(memberships.status, "removed")))
      .orderBy(users.name);
    const ids = rows.map((r) => r.membershipId);
    const [roles, custom, assigned, invites, activeCustom] = await Promise.all([
      ids.length ? tx.select().from(staffRoles).where(inArray(staffRoles.membershipId, ids)) : [],
      ids.length
        ? tx
            .select({ membershipId: staffCustomRoles.membershipId, id: customRoles.id, name: customRoles.name })
            .from(staffCustomRoles)
            .innerJoin(customRoles, eq(customRoles.id, staffCustomRoles.customRoleId))
            .where(and(inArray(staffCustomRoles.membershipId, ids), isNull(customRoles.archivedAt)))
            .orderBy(customRoles.name)
        : [],
      ids.length
        ? tx
            .select({ membershipId: teamCoaches.membershipId, id: teams.id, name: teams.name })
            .from(teamCoaches)
            .innerJoin(teams, eq(teams.id, teamCoaches.teamId))
            .where(and(inArray(teamCoaches.membershipId, ids), isNull(teams.archivedAt)))
            .orderBy(teams.name)
        : [],
      tx
        .select({ id: invitations.id, email: invitations.email, roles: invitations.roles, customRoleIds: invitations.customRoleIds, expiresAt: invitations.expiresAt })
        .from(invitations)
        .where(and(isNull(invitations.acceptedAt), isNull(invitations.revokedAt), sql`${invitations.expiresAt} > now()`))
        .orderBy(invitations.createdAt),
      tx.select({ id: customRoles.id, name: customRoles.name }).from(customRoles).where(isNull(customRoles.archivedAt)),
    ]);
    const members = rows.map((r) => ({
      ...r,
      roles: roles.filter((x) => x.membershipId === r.membershipId).map((x) => x.role).sort(byRank),
      customRoles: custom.filter((x) => x.membershipId === r.membershipId).map(({ id, name }) => ({ id, name })),
      teams: assigned.filter((x) => x.membershipId === r.membershipId).map(({ id, name }) => ({ id, name })),
    }));
    // Pemilik dulu, lalu urut peran tertinggi, lalu nama.
    members.sort((a, b) => byRank(a.roles[0] ?? "coach", b.roles[0] ?? "coach") || a.name.localeCompare(b.name));
    const nameOf = new Map(activeCustom.map((c) => [c.id, c.name]));
    return {
      members,
      invites: invites.map(({ customRoleIds, ...i }) => ({
        ...i,
        customRoleNames: customRoleIds.map((id) => nameOf.get(id)).filter((n): n is string => Boolean(n)),
      })),
    };
  });
}

export async function getStaffMember(ctx: AcademyContext, membershipId: string): Promise<StaffMember> {
  const member = (await listStaff(ctx)).members.find((m) => m.membershipId === membershipId);
  if (!member) throw notFound("Staf");
  return member;
}

/** Hanya Pemilik yang boleh memberi/mencabut peran Pemilik atau mengubah anggota yang Pemilik. */
function assertCanTouchOwner(ctx: AcademyContext, roles: Role[], current: Role[] = []) {
  if ((roles.includes("owner") || current.includes("owner")) && !ctx.roles.includes("owner")) throw forbidden();
}

/** Peran custom harus aktif di akademi ini, dan izinnya harus dimiliki pemberi. Mengembalikan namanya. */
async function assertCustomRoles(ctx: AcademyContext, tx: Tx, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const found = await tx
    .select({ id: customRoles.id, name: customRoles.name, permissions: customRoles.permissions })
    .from(customRoles)
    .where(and(inArray(customRoles.id, ids), isNull(customRoles.archivedAt)));
  if (found.length !== new Set(ids).size) {
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { roles: "Peran tidak ditemukan." });
  }
  for (const r of found) assertCanGrant(ctx, r.permissions);
  return found.map((r) => r.name);
}

async function assertTeams(tx: Tx, ids: string[]) {
  if (ids.length === 0) return;
  const found = await tx
    .select({ id: teams.id })
    .from(teams)
    .where(and(inArray(teams.id, ids), isNull(teams.archivedAt)));
  if (found.length !== new Set(ids).size) {
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { teamIds: "Tim tidak ditemukan." });
  }
}

/** Akademi harus selalu punya minimal satu Pemilik aktif selain yang sedang diubah. */
async function assertAnotherOwner(tx: Tx, membershipId: string) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(staffRoles)
    .innerJoin(memberships, eq(memberships.id, staffRoles.membershipId))
    .where(and(eq(staffRoles.role, "owner"), eq(memberships.status, "active"), ne(memberships.id, membershipId)));
  if (!row?.n) {
    throw new AppError(409, "last_owner", "Akademi harus punya minimal satu Pemilik. Jadikan orang lain Pemilik dulu.");
  }
}

export async function inviteStaff(ctx: AcademyContext, raw: z.input<typeof InviteInput>): Promise<string> {
  requirePermission(ctx, "staff.manage");
  const input = { ...raw, roles: raw.roles ?? [], customRoleIds: [...new Set(raw.customRoleIds ?? [])], teamIds: raw.teamIds ?? [] };
  if (input.roles.length + input.customRoleIds.length === 0) {
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { roles: "Pilih minimal satu peran." });
  }
  assertCanTouchOwner(ctx, input.roles);
  const email = input.email.toLowerCase();
  let customNames: string[] = [];
  const id = await inAcademy(ctx, async (tx) => {
    await assertTeams(tx, input.teamIds);
    customNames = await assertCustomRoles(ctx, tx, input.customRoleIds);
    const [member] = await tx
      .select({ status: memberships.status })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(sql`${users.email} = ${email}::citext`, eq(memberships.status, "active")));
    if (member) {
      throw new AppError(409, "already_member", "Orang ini sudah menjadi staf.", { email: "Email ini sudah terdaftar sebagai staf." });
    }
    // Mengundang ulang email yang sama menggantikan undangan lama.
    await tx
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(and(sql`${invitations.email} = ${email}::citext`, isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    const [row] = await tx
      .insert(invitations)
      .values({
        businessId: ctx.businessId,
        email,
        roles: [...new Set(input.roles)],
        customRoleIds: input.customRoleIds,
        teamIds: [...new Set(input.teamIds)],
        invitedBy: ctx.userId,
        expiresAt: sql`now() + interval '14 days'` as unknown as Date,
      })
      .returning({ id: invitations.id });
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "staff.invited",
      targetType: "invitation",
      targetId: row!.id,
    });
    return row!.id;
  });
  const academy = await getAcademy(ctx);
  // Gagal kirim email tidak membatalkan undangan; penerima tetap bisa melihatnya di /undangan.
  await sendStaffInvite(email, academy.name, ctx.session.name, roleLabels(input.roles, customNames), formatBusinessCode(academy.code)).catch((error: unknown) => {
    console.error("gagal kirim undangan", error instanceof Error ? error.message : error);
  });
  return id;
}

export async function revokeInvitation(ctx: AcademyContext, id: string): Promise<void> {
  requirePermission(ctx, "staff.manage");
  await inAcademy(ctx, async (tx) => {
    const [inv] = await tx
      .select({ roles: invitations.roles })
      .from(invitations)
      .where(and(eq(invitations.id, id), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    if (!inv) throw notFound("Undangan");
    assertCanTouchOwner(ctx, inv.roles);
    await tx.update(invitations).set({ revokedAt: new Date() }).where(eq(invitations.id, id));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "staff.invitation_revoked",
      targetType: "invitation",
      targetId: id,
    });
  });
}

export async function updateStaff(
  ctx: AcademyContext,
  membershipId: string,
  raw: z.input<typeof StaffUpdateInput>,
): Promise<void> {
  requirePermission(ctx, "staff.manage");
  const input = { roles: raw.roles ?? [], customRoleIds: [...new Set(raw.customRoleIds ?? [])], teamIds: raw.teamIds ?? [] };
  if (input.roles.length + input.customRoleIds.length === 0) {
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { roles: "Pilih minimal satu peran." });
  }
  const member = await getStaffMember(ctx, membershipId);
  const next = [...new Set(input.roles)];
  assertCanTouchOwner(ctx, next, member.roles);
  await inAcademy(ctx, async (tx) => {
    await assertTeams(tx, input.teamIds);
    if (member.roles.includes("owner") && !next.includes("owner")) await assertAnotherOwner(tx, membershipId);
    await tx.delete(staffRoles).where(eq(staffRoles.membershipId, membershipId));
    if (next.length) await tx.insert(staffRoles).values(next.map((role) => ({ businessId: ctx.businessId, membershipId, role })));
    // Peran custom yang sudah dipegang boleh tetap; yang baru ditambahkan harus lolos cek izin pemberi.
    const had = new Set(member.customRoles.map((c) => c.id));
    await assertCustomRoles(ctx, tx, input.customRoleIds.filter((id) => !had.has(id)));
    await tx.delete(staffCustomRoles).where(eq(staffCustomRoles.membershipId, membershipId));
    if (input.customRoleIds.length) {
      const stillActive = await tx
        .select({ id: customRoles.id })
        .from(customRoles)
        .where(and(inArray(customRoles.id, input.customRoleIds), isNull(customRoles.archivedAt)));
      if (stillActive.length !== input.customRoleIds.length) {
        throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { roles: "Peran tidak ditemukan." });
      }
      await tx
        .insert(staffCustomRoles)
        .values(input.customRoleIds.map((customRoleId) => ({ businessId: ctx.businessId, membershipId, customRoleId })));
    }
    await tx.delete(teamCoaches).where(eq(teamCoaches.membershipId, membershipId));
    if (input.teamIds.length) {
      await tx
        .insert(teamCoaches)
        .values([...new Set(input.teamIds)].map((teamId) => ({ businessId: ctx.businessId, teamId, membershipId })));
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "staff.updated",
      targetType: "membership",
      targetId: membershipId,
      meta: { roles: next, customRoleIds: input.customRoleIds },
    });
  });
}

/** Menonaktifkan staf langsung mencabut aksesnya (konteks akademi dibaca ulang di setiap permintaan). */
export async function setStaffStatus(ctx: AcademyContext, membershipId: string, status: "active" | "suspended"): Promise<void> {
  requirePermission(ctx, "staff.manage");
  if (membershipId === ctx.membershipId) {
    throw new AppError(409, "self", "Anda tidak bisa menonaktifkan akun Anda sendiri.");
  }
  const member = await getStaffMember(ctx, membershipId);
  assertCanTouchOwner(ctx, [], member.roles);
  await inAcademy(ctx, async (tx) => {
    if (status === "suspended" && member.roles.includes("owner")) await assertAnotherOwner(tx, membershipId);
    await tx.update(memberships).set({ status }).where(eq(memberships.id, membershipId));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: status === "active" ? "staff.reactivated" : "staff.suspended",
      targetType: "membership",
      targetId: membershipId,
    });
  });
}

// ---------- Sisi penerima undangan (belum tentu punya akademi aktif) ----------

export interface MyInvitation {
  id: string;
  academyName: string;
  invitedByName: string | null;
  roles: Role[];
}

export async function myInvitations(userId: string): Promise<MyInvitation[]> {
  // Undangan dikirim ke alamat email; hanya yang sudah terbukti memiliki alamat itu yang boleh melihatnya.
  if (!(await isEmailVerified(db(), userId))) return [];
  const rows = (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`SELECT id, academy_name, invited_by_name, roles FROM bola.my_invitations()`),
  )) as unknown as { id: string; academy_name: string; invited_by_name: string | null; roles: string | Role[] }[];
  return rows.map((r) => ({
    id: r.id,
    academyName: r.academy_name,
    invitedByName: r.invited_by_name,
    // Array enum bisa datang sebagai teks "{a,b}" tergantung driver.
    roles: (Array.isArray(r.roles) ? r.roles : r.roles.replace(/[{}]/g, "").split(",")).filter(Boolean) as Role[],
  }));
}

export async function acceptInvitation(session: SessionInfo, invitationId: string): Promise<string> {
  if (!(await isEmailVerified(db(), session.userId))) throw unverifiedEmail();
  const [row] = (await withContext(db(), { userId: session.userId }, (tx) =>
    tx.execute(sql`SELECT bola.accept_invitation(${invitationId}::uuid) AS id`),
  )) as unknown as { id: string | null }[];
  if (!row?.id) throw notFound("Undangan");
  await setActiveBusiness(db(), session.sessionId, row.id);
  return row.id;
}
