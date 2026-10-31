import "server-only";
import type { Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import { effectiveModules } from "@/lib/modules";
import type { SessionInfo } from "@saturoom/core/auth";
import { AppError } from "./errors";
import { catalog, ordersWhere, placeOrderIn, type OrderInput, type OrderRow } from "./inventory";
import { playerTx } from "./player-account";

async function storeOn(tx: Tx): Promise<boolean> {
  const off = (await tx.execute(sql`SELECT module FROM bola.academy_modules WHERE NOT enabled`)) as unknown as { module: string }[];
  return effectiveModules(off.map((r) => r.module)).has("store");
}

export interface ParentStore {
  items: Awaited<ReturnType<typeof catalog>>;
  orders: OrderRow[];
}

/** Toko di portal pemain/orang tua: katalog dan pesanan milik pemain ini. Null bila toko dimatikan. */
export async function parentStore(session: SessionInfo): Promise<ParentStore | null> {
  return playerTx(session, async (tx, link) => {
    if (!(await storeOn(tx))) return null;
    return { items: (await catalog(tx)).filter((i) => i.qty > 0), orders: await ordersWhere(tx, sql`o.player_id = ${link.playerId}::uuid`) };
  });
}

/** Orang tua memesan. Dibayar di akademi (tunai/transfer); staf mencatat pembayarannya. */
export async function parentOrder(session: SessionInfo, lines: z.infer<typeof OrderInput>["lines"], note?: string | null): Promise<string> {
  return playerTx(session, async (tx, link) => {
    if (!(await storeOn(tx))) throw new AppError(403, "module_off", "Toko tidak aktif.");
    const [p] = (await tx.execute(sql`SELECT full_name AS name FROM bola.players WHERE id = ${link.playerId}::uuid`)) as unknown as { name: string }[];
    const [open] = (await tx.execute(sql`
      SELECT count(*)::int AS n FROM bola.orders WHERE player_id = ${link.playerId}::uuid AND status = 'pending'`)) as unknown as { n: number }[];
    if (open!.n >= 5) throw new AppError(429, "too_many", "Masih ada 5 pesanan belum dibayar. Selesaikan dulu di akademi.");
    return placeOrderIn(tx, link.businessId, session.userId, { playerId: link.playerId, buyerName: p!.name, note: note ?? null, lines }, "parent");
  });
}

/** Orang tua membatalkan pesanan yang belum dibayar. */
export async function parentCancel(session: SessionInfo, orderId: string): Promise<void> {
  await playerTx(session, async (tx, link) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.orders SET status = 'cancelled' WHERE id = ${orderId}::uuid AND player_id = ${link.playerId}::uuid AND status = 'pending' RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw new AppError(409, "not_pending", "Pesanan ini tidak bisa dibatalkan lagi.");
  });
}
