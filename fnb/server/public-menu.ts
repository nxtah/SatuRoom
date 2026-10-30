import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

export type PublicMenu = {
  business: { name: string; city: string | null; address: string | null; logoUrl: string | null };
  categories: { id: string; name: string; description: string | null; imageUrl: string | null; items: { id: string; name: string; description: string | null; imageUrl: string | null; price: number; available: boolean }[] }[];
  at: string;
};

/** Menu untuk pelanggan tanpa login. Kode dicek bentuknya dulu; fungsi database hanya mengembalikan data menu. */
export async function publicMenu(code: string): Promise<PublicMenu | null> {
  if (!/^[A-Za-z0-9-]{4,20}$/.test(code)) return null;
  const [row] = (await db().execute(sql`SELECT fnb.public_menu(${code}) AS menu`)) as unknown as { menu: PublicMenu | null }[];
  return row?.menu ?? null;
}
