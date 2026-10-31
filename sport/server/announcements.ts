import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { AnnouncementInput } from "@/lib/schemas";
import { inAcademy, type AcademyContext, requireModule } from "./context";
import { forbidden, notFound } from "./errors";
import { uuidList } from "./schedule";
import { visibleTeamIds } from "./teams";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  teamId: string | null;
  teamName: string | null;
  authorName: string | null;
  /** Tanggal (YYYY-MM-DD) menurut zona waktu akademi. */
  createdAt: string;
  /** Staf ini boleh mengarsipkan pengumuman ini. */
  canArchive: boolean;
}

const COLUMNS = sql`
  a.id, a.title, a.body, a.team_id AS "teamId", t.name AS "teamName", u.name AS "authorName",
  to_char(a.created_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "createdAt",
  a.created_by AS "createdBy"
`;
const FROM = sql`
  FROM bola.announcements a
  LEFT JOIN bola.teams t ON t.id = a.team_id
  LEFT JOIN core.users u ON u.id = a.created_by
  JOIN core.businesses b ON b.id = a.business_id
`;

/** Pengumuman yang boleh dilihat staf ini: seluruh akademi plus tim dalam cakupannya. */
export async function listAnnouncements(ctx: AcademyContext): Promise<AnnouncementRow[]> {
  requireModule(ctx, "announcements");
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    const rows = (await tx.execute(sql`
      SELECT ${COLUMNS} ${FROM}
      WHERE a.archived_at IS NULL
        ${scope ? (scope.length ? sql`AND (a.team_id IS NULL OR a.team_id IN (${uuidList(scope)}))` : sql`AND a.team_id IS NULL`) : sql``}
      ORDER BY a.created_at DESC LIMIT 50`)) as unknown as (Omit<AnnouncementRow, "canArchive"> & { createdBy: string | null })[];
    return rows.map(({ createdBy, ...r }) => ({
      ...r,
      canArchive: ctx.can("announcements.manage") || createdBy === ctx.userId,
    }));
  });
}

/** Tim yang boleh menjadi tujuan pengumuman staf ini; null = semua tim dan seluruh akademi. */
export async function announcementTargets(ctx: AcademyContext): Promise<{ all: boolean; teamIds: string[] | null }> {
  requireModule(ctx, "announcements");
  return inAcademy(ctx, async (tx) => ({ all: ctx.can("announcements.manage"), teamIds: await visibleTeamIds(ctx, tx) }));
}

export async function createAnnouncement(ctx: AcademyContext, input: z.infer<typeof AnnouncementInput>): Promise<string> {
  requireModule(ctx, "announcements");
  const teamId = input.teamId ?? null;
  return inAcademy(ctx, async (tx) => {
    if (!ctx.can("announcements.manage")) {
      // Pelatih hanya boleh menulis untuk tim yang dia latih.
      const scope = (await visibleTeamIds(ctx, tx)) ?? [];
      if (!teamId || !scope.includes(teamId)) throw forbidden();
    }
    if (teamId) await assertTeam(tx, teamId);
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.announcements (business_id, team_id, title, body, created_by)
      VALUES (${ctx.businessId}::uuid, ${teamId}::uuid, ${input.title}, ${input.body}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "announcement.created",
      targetType: "announcement",
      targetId: row!.id,
      meta: { teamId },
    });
    return row!.id;
  });
}

export async function archiveAnnouncement(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "announcements");
  await inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    const [row] = (await tx.execute(sql`
      SELECT team_id AS "teamId", created_by AS "createdBy" FROM bola.announcements
      WHERE id = ${id}::uuid AND archived_at IS NULL`)) as unknown as { teamId: string | null; createdBy: string | null }[];
    // Di luar cakupan diperlakukan seperti tidak ada.
    if (!row || (scope && row.teamId && !scope.includes(row.teamId))) throw notFound("Pengumuman");
    if (!ctx.can("announcements.manage") && row.createdBy !== ctx.userId) throw forbidden();
    await tx.execute(sql`UPDATE bola.announcements SET archived_at = now() WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "announcement.archived",
      targetType: "announcement",
      targetId: id,
    });
  });
}

async function assertTeam(tx: Tx, teamId: string) {
  const [t] = (await tx.execute(sql`SELECT 1 AS ok FROM bola.teams WHERE id = ${teamId}::uuid AND archived_at IS NULL`)) as unknown as { ok: number }[];
  if (!t) throw notFound("Tim");
}

/** Pengumuman untuk seorang pemain: seluruh akademi plus tim yang dia ikuti. Dipanggil dalam transaksi akademinya. */
export async function announcementsForPlayer(tx: Tx, playerId: string) {
  return (await tx.execute(sql`
    SELECT a.id, a.title, a.body, t.name AS "teamName",
           to_char(a.created_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "createdAt"
    FROM bola.announcements a
    JOIN core.businesses b ON b.id = a.business_id
    LEFT JOIN bola.teams t ON t.id = a.team_id
    WHERE a.archived_at IS NULL
      AND (a.team_id IS NULL OR EXISTS (
        SELECT 1 FROM bola.team_players tp WHERE tp.team_id = a.team_id AND tp.player_id = ${playerId}::uuid))
    ORDER BY a.created_at DESC LIMIT 5`)) as unknown as {
    id: string; title: string; body: string; teamName: string | null; createdAt: string;
  }[];
}
