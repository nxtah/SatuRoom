import "server-only";
import { isEmailVerified, setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents, memberships, users } from "@saturoom/core/schema";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import type { InviteInput, StaffUpdateInput } from "@/lib/schemas";
import { getVenue } from "./venue";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound, unverifiedEmail } from "./errors";
import { sendStaffInvite } from "./mail";
import { ROLE_LABEL, ROLES, type Role } from "./permissions";
import { invitations, staffRoles } from "./schema";

export interface StaffMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  status: "active" | "suspended" | "removed";
  roles: Role[];
}

export interface PendingInvite {
  id: string;
  email: string;
  roles: Role[];
  expiresAt: Date;
}

const byRank = (a: Role, b: Role) => ROLES.indexOf(a) - ROLES.indexOf(b);
export const roleLabels = (roles: Role[]) => [...roles].sort(byRank).map((r) => ROLE_LABEL[r]).join(", ");

export async function listStaff(ctx: VenueContext): Promise<{ members: StaffMember[]; invites: PendingInvite[] }> {
  requirePermission(ctx, "staff.read");
  return inVenue(ctx, async (tx) => {
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
    const [roles, invites] = await Promise.all([
      ids.length ? tx.select().from(staffRoles).where(inArray(staffRoles.membershipId, ids)) : [],
      tx
        .select({ id: invitations.id, email: invitations.email, roles: invitations.roles, expiresAt: invitations.expiresAt })
        .from(invitations)
        .where(and(isNull(invitations.acceptedAt), isNull(invitations.revokedAt), sql`${invitations.expiresAt} > now()`))
        .orderBy(invitations.createdAt),
    ]);
    const members = rows.map((r) => ({
      ...r,
      roles: roles.filter((x) => x.membershipId === r.membershipId).map((x) => x.role).sort(byRank),
    }));
    // Pemilik dulu, lalu urut peran tertinggi, lalu nama.
    members.sort((a, b) => byRank(a.roles[0] ?? "server", b.roles[0] ?? "server") || a.name.localeCompare(b.name));
    return { members, invites };
  });
}

export async function getStaffMember(ctx: VenueContext, membershipId: string): Promise<StaffMember> {
  const member = (await listStaff(ctx)).members.find((m) => m.membershipId === membershipId);
  if (!member) throw notFound("Staf");
  return member;
}

/** Hanya Pemilik yang boleh memberi/mencabut peran Pemilik atau mengubah anggota yang Pemilik. */
function assertCanTouchOwner(ctx: VenueContext, roles: Role[], current: Role[] = []) {
  if ((roles.includes("owner") || current.includes("owner")) && !ctx.roles.includes("owner")) throw forbidden();
}

/** Tempat harus selalu punya minimal satu Pemilik aktif selain yang sedang diubah. */
async function assertAnotherOwner(tx: Tx, membershipId: string) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(staffRoles)
    .innerJoin(memberships, eq(memberships.id, staffRoles.membershipId))
    .where(and(eq(staffRoles.role, "owner"), eq(memberships.status, "active"), ne(memberships.id, membershipId)));
  if (!row?.n) {
    throw new AppError(409, "last_owner", "Tempat harus punya minimal satu Pemilik. Jadikan orang lain Pemilik dulu.");
  }
}

export async function inviteStaff(ctx: VenueContext, input: z.infer<typeof InviteInput>): Promise<string> {
  requirePermission(ctx, "staff.manage");
  assertCanTouchOwner(ctx, input.roles);
  const email = input.email.toLowerCase();
  const id = await inVenue(ctx, async (tx) => {
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
  const venue = await getVenue(ctx);
  // Gagal kirim email tidak membatalkan undangan; penerima tetap bisa melihatnya di /undangan.
  await sendStaffInvite(email, venue.name, ctx.session.name, roleLabels(input.roles)).catch((error: unknown) => {
    console.error("gagal kirim undangan", error instanceof Error ? error.message : error);
  });
  return id;
}

export async function revokeInvitation(ctx: VenueContext, id: string): Promise<void> {
  requirePermission(ctx, "staff.manage");
  await inVenue(ctx, async (tx) => {
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
  ctx: VenueContext,
  membershipId: string,
  input: z.infer<typeof StaffUpdateInput>,
): Promise<void> {
  requirePermission(ctx, "staff.manage");
  const member = await getStaffMember(ctx, membershipId);
  const next = [...new Set(input.roles)];
  assertCanTouchOwner(ctx, next, member.roles);
  await inVenue(ctx, async (tx) => {
    if (member.roles.includes("owner") && !next.includes("owner")) await assertAnotherOwner(tx, membershipId);
    await tx.delete(staffRoles).where(eq(staffRoles.membershipId, membershipId));
    await tx.insert(staffRoles).values(next.map((role) => ({ businessId: ctx.businessId, membershipId, role })));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "staff.updated",
      targetType: "membership",
      targetId: membershipId,
      meta: { roles: next },
    });
  });
}

/** Menonaktifkan staf langsung mencabut aksesnya (konteks tempat dibaca ulang di setiap permintaan). */
export async function setStaffStatus(ctx: VenueContext, membershipId: string, status: "active" | "suspended"): Promise<void> {
  requirePermission(ctx, "staff.manage");
  if (membershipId === ctx.membershipId) {
    throw new AppError(409, "self", "Anda tidak bisa menonaktifkan akun Anda sendiri.");
  }
  const member = await getStaffMember(ctx, membershipId);
  assertCanTouchOwner(ctx, [], member.roles);
  await inVenue(ctx, async (tx) => {
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

// ---------- Sisi penerima undangan (belum tentu punya tempat aktif) ----------

export interface MyInvitation {
  id: string;
  venueName: string;
  invitedByName: string | null;
  roles: Role[];
}

export async function myInvitations(userId: string): Promise<MyInvitation[]> {
  // Undangan dikirim ke alamat email; hanya yang sudah terbukti memiliki alamat itu yang boleh melihatnya.
  if (!(await isEmailVerified(db(), userId))) return [];
  const rows = (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`SELECT id, venue_name, invited_by_name, roles FROM mahjong.my_invitations()`),
  )) as unknown as { id: string; venue_name: string; invited_by_name: string | null; roles: string | Role[] }[];
  return rows.map((r) => ({
    id: r.id,
    venueName: r.venue_name,
    invitedByName: r.invited_by_name,
    // Array enum bisa datang sebagai teks "{a,b}" tergantung driver.
    roles: (Array.isArray(r.roles) ? r.roles : r.roles.replace(/[{}]/g, "").split(",")).filter(Boolean) as Role[],
  }));
}

export async function acceptInvitation(session: SessionInfo, invitationId: string): Promise<string> {
  if (!(await isEmailVerified(db(), session.userId))) throw unverifiedEmail();
  const [row] = (await withContext(db(), { userId: session.userId }, (tx) =>
    tx.execute(sql`SELECT mahjong.accept_invitation(${invitationId}::uuid) AS id`),
  )) as unknown as { id: string | null }[];
  if (!row?.id) throw notFound("Undangan");
  await setActiveBusiness(db(), session.sessionId, row.id);
  return row.id;
}
