import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { z } from "zod";
import type { MenuInput } from "@/lib/schemas";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { notFound } from "./errors";
import { menuItems } from "./schema";

export interface MenuRow {
  id: string;
  name: string;
  category: "drink" | "food" | "snack" | "other";
  price: number;
  stock: number | null;
  isAvailable: boolean;
}

export const CATEGORY_LABEL = { drink: "Minuman", food: "Makanan", snack: "Camilan", other: "Lainnya" } as const;

/** Menu aktif. Dipakai pelayan dan host saat mencatat pesanan, jadi cukup izin mencatat pesanan. */
export function listMenu(ctx: VenueContext): Promise<MenuRow[]> {
  if (!ctx.can("orders.add") && !ctx.can("menu.manage")) requirePermission(ctx, "orders.add");
  return inVenue(ctx, (tx) =>
    tx
      .select({ id: menuItems.id, name: menuItems.name, category: menuItems.category, price: menuItems.price, stock: menuItems.stock, isAvailable: menuItems.isAvailable })
      .from(menuItems)
      .where(isNull(menuItems.archivedAt))
      .orderBy(asc(menuItems.category), asc(menuItems.name)),
  );
}

export async function createMenuItem(ctx: VenueContext, input: z.infer<typeof MenuInput>): Promise<string> {
  requirePermission(ctx, "menu.manage");
  return inVenue(ctx, async (tx) => {
    const [row] = await tx
      .insert(menuItems)
      .values({ businessId: ctx.businessId, ...input, stock: input.stock ?? null, isAvailable: input.isAvailable ?? true })
      .returning({ id: menuItems.id });
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "menu.created", targetType: "menu_item", targetId: row!.id });
    return row!.id;
  });
}

export async function updateMenuItem(ctx: VenueContext, id: string, input: z.infer<typeof MenuInput>): Promise<void> {
  requirePermission(ctx, "menu.manage");
  await inVenue(ctx, async (tx) => {
    const done = await tx
      .update(menuItems)
      .set({ ...input, stock: input.stock ?? null, isAvailable: input.isAvailable ?? true })
      .where(and(eq(menuItems.id, id), isNull(menuItems.archivedAt)))
      .returning({ id: menuItems.id });
    if (!done.length) throw notFound("Menu");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "menu.updated", targetType: "menu_item", targetId: id });
  });
}

/** Menu diarsipkan, tidak dihapus: pesanan lama tetap menunjuk ke menu ini. */
export async function archiveMenuItem(ctx: VenueContext, id: string): Promise<void> {
  requirePermission(ctx, "menu.manage");
  await inVenue(ctx, async (tx) => {
    const done = await tx.update(menuItems).set({ archivedAt: new Date() }).where(and(eq(menuItems.id, id), isNull(menuItems.archivedAt))).returning({ id: menuItems.id });
    if (!done.length) throw notFound("Menu");
  });
}
