import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden } from "./errors";

export type AuditRow = { id: number; action: string; label: string; actor: string | null; targetType: string | null; at: string; meta: Record<string, unknown> };

/** Kelompok aksi yang bisa disaring di layar jejak aktivitas. */
export const AUDIT_GROUPS = [
  ["", "Semua"], ["fnb.order", "Pesanan"], ["fnb.payment", "Pembayaran"], ["fnb.cash", "Kas"], ["fnb.shift", "Shift"], ["fnb.stock", "Stok"],
  ["fnb.expense", "Pengeluaran"], ["fnb.staff", "Staf"], ["fnb.role", "Peran"], ["fnb.item", "Menu"], ["fnb.table", "Meja"], ["fnb.settings", "Pengaturan"],
] as const;

const LABEL: Record<string, string> = {
  "fnb.order.created": "Pesanan dibuat", "fnb.order.status_changed": "Status pesanan berubah", "fnb.order.moved": "Pesanan dipindah meja",
  "fnb.order.merged": "Pesanan digabung", "fnb.order.split": "Tagihan dipisah", "fnb.payment.recorded": "Pembayaran diterima",
  "fnb.payment.voided": "Pembayaran dibatalkan", "fnb.payment.refunded": "Refund", "fnb.cash_movement.recorded": "Kas masuk/keluar",
  "fnb.stock.adjusted": "Stok disesuaikan", "fnb.stock.waste": "Bahan terbuang", "fnb.stock.counted": "Stok opname",
  "fnb.expense.created": "Pengeluaran dicatat", "fnb.expense.voided": "Pengeluaran dibatalkan", "fnb.table.created": "Meja dibuat",
  "fnb.table.updated": "Meja diubah", "fnb.shift.opened": "Shift dibuka", "fnb.shift.closed": "Shift ditutup", "fnb.order_line.status_changed": "Status item berubah",
  "fnb.item.groups_changed": "Pilihan menu diubah", "fnb.modifier_group.archived": "Grup pilihan dihapus", "fnb.ingredient.created": "Bahan ditambahkan",
  "fnb.recipe.updated": "Resep diubah", "fnb.purchase.recorded": "Pembelian dicatat", "fnb.supplier.created": "Supplier ditambahkan",
  "fnb.role.created": "Peran dibuat", "fnb.role.updated": "Peran diubah", "fnb.role.archived": "Peran dihapus", "fnb.staff.invited": "Staf diundang",
  "fnb.staff.invitation_revoked": "Undangan dicabut", "fnb.staff.roles_changed": "Peran staf diubah", "fnb.table.archived": "Meja dihapus", "fnb.settings.updated": "Pengaturan diubah",
};

export async function listAudit(ctx: FnbContext, group = "", limit = 150): Promise<AuditRow[]> {
  if (!can(ctx, "audit.read")) throw forbidden();
  const prefix = AUDIT_GROUPS.some(([g]) => g === group) ? group : "";
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT a.id::int AS id, a.action, u.name AS actor, a.target_type AS "targetType", a.created_at AS at, a.meta
      FROM core.audit_events a LEFT JOIN core.users u ON u.id = a.actor_user_id
      WHERE a.action LIKE 'fnb.%' ${prefix ? sql`AND a.action LIKE ${`${prefix}%`}` : sql``}
      ORDER BY a.id DESC LIMIT ${Math.min(limit, 500)}`)) as unknown as Omit<AuditRow, "label">[];
    return rows.map((r) => ({ ...r, label: LABEL[r.action] ?? r.action.replace(/^fnb\./, "").replaceAll("_", " ").replaceAll(".", " · ") }));
  });
}
