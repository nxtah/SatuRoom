import "server-only";
import { sql } from "drizzle-orm";
import { inAcademy, requirePermission, type AcademyContext } from "./context";

export interface AuditRow {
  id: number;
  action: string;
  label: string;
  actor: string | null;
  at: string;
}

/** Kelompok yang bisa disaring di layar Jejak aktivitas: [awalan aksi, label]. */
export const AUDIT_GROUPS = [
  ["", "Semua"],
  ["player", "Pemain"],
  ["registration", "Pendaftaran"],
  ["team", "Tim"],
  ["schedule", "Jadwal"],
  ["session", "Latihan"],
  ["attendance", "Absensi"],
  ["invoice", "Iuran"],
  ["staff", "Staf"],
  ["role", "Peran"],
  ["academy", "Akademi"],
] as const;

const LABEL: Record<string, string> = {
  "academy.created": "Akademi dibuat",
  "academy.updated": "Profil akademi diubah",
  "academy.logo_set": "Logo dipasang",
  "academy.logo_removed": "Logo dihapus",
  "absence_notice.submitted": "Izin/sakit dikirim",
  "announcement.created": "Pengumuman dibuat",
  "announcement.archived": "Pengumuman dihapus",
  "attendance.recorded": "Absensi dicatat",
  "attendance.qr_scanned": "Absen lewat QR",
  "evaluation.drafted": "Rapor disimpan",
  "evaluation.sent": "Rapor dikirim",
  "evaluation.updated": "Rapor diubah",
  "evaluation.deleted": "Rapor dihapus",
  "fee.updated": "Tarif iuran diubah",
  "invoices.generated": "Tagihan dibuat",
  "invoice.pay": "Iuran dibayar",
  "invoice.unpay": "Pembayaran dibatalkan",
  "invoice.waive": "Iuran dibebaskan",
  "invoice.amount": "Nominal tagihan diubah",
  "guardian.invitation_accepted": "Orang tua bergabung",
  "location.created": "Lokasi ditambah",
  "location.updated": "Lokasi diubah",
  "location.archived": "Lokasi dihapus",
  "match.saved": "Hasil pertandingan disimpan",
  "player.created": "Pemain ditambah",
  "player.updated": "Data pemain diubah",
  "player.deactivated": "Pemain dinonaktifkan",
  "player.reactivated": "Pemain diaktifkan lagi",
  "player_account.invited": "Akun pemain diundang",
  "player_account.linked": "Akun pemain terhubung",
  "player_account.unlinked": "Akun pemain diputus",
  "registration.submitted": "Pendaftar baru masuk",
  "registration.approved": "Pendaftar diterima",
  "registration.rejected": "Pendaftar ditolak",
  "registration_link.updated": "Link pendaftaran diubah",
  "registration_link.rotated": "Link pendaftaran diganti",
  "role.created": "Peran dibuat",
  "role.updated": "Peran diubah",
  "role.archived": "Peran dihapus",
  "schedule.created": "Jadwal rutin dibuat",
  "schedule.stopped": "Jadwal rutin dihentikan",
  "session.created": "Latihan dijadwalkan",
  "session.cancelled": "Latihan dibatalkan",
  "session.restored": "Latihan diadakan lagi",
  "staff.invited": "Staf diundang",
  "staff.invitation_revoked": "Undangan dicabut",
  "staff.invitation_accepted": "Staf bergabung",
  "staff.updated": "Peran staf diubah",
  "staff.suspended": "Staf dinonaktifkan",
  "staff.reactivated": "Staf diaktifkan lagi",
  "team.created": "Tim dibuat",
  "team.updated": "Tim diubah",
  "team.archived": "Tim diarsipkan",
};

export const auditLabel = (action: string) => LABEL[action] ?? action.replaceAll("_", " ").replaceAll(".", " · ");

/** Riwayat aktivitas akademi aktif, terbaru dulu. RLS membatasi ke akademi ini saja. */
export async function listAudit(ctx: AcademyContext, group = "", limit = 150): Promise<AuditRow[]> {
  requirePermission(ctx, "audit.read");
  const prefix = AUDIT_GROUPS.some(([g]) => g === group) ? group : "";
  return inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT a.id::int AS id, a.action, u.name AS actor, a.created_at AS at
      FROM core.audit_events a LEFT JOIN core.users u ON u.id = a.actor_user_id
      WHERE a.business_id = ${ctx.businessId}::uuid
        ${prefix ? sql`AND (a.action LIKE ${`${prefix}.%`} OR a.action LIKE ${`${prefix}s.%`} OR a.action LIKE ${`${prefix}\\_%`})` : sql``}
      ORDER BY a.id DESC LIMIT ${Math.min(limit, 500)}`)) as unknown as Omit<AuditRow, "label">[];
    return rows.map((r) => ({ ...r, at: new Date(r.at).toISOString(), label: auditLabel(r.action) }));
  });
}
