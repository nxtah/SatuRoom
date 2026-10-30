import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { BusinessProfileInput } from "@/lib/schemas";
import { cleanImageUrl } from "./cloudinary";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden } from "./errors";

export type BusinessProfile = { name: string; code: string; city: string | null; address: string | null; logoUrl: string | null; publicMenuEnabled: boolean };

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

/** Nama, logo, dan lokasi bisnis untuk Beranda dan menu samping. Boleh dibaca semua anggota. */
export async function getProfile(ctx: FnbContext): Promise<BusinessProfile> {
  return inBusiness(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      SELECT b.name, b.code, coalesce(s.business_city, b.city) AS city, s.business_address AS address, s.business_logo_url AS "logoUrl", coalesce(s.public_menu_enabled, true) AS "publicMenuEnabled"
      FROM core.businesses b LEFT JOIN fnb.settings s ON s.business_id = b.id WHERE b.id = ${ctx.businessId}::uuid`)) as unknown as BusinessProfile[];
    return row!;
  });
}

export async function saveProfile(ctx: FnbContext, input: z.infer<typeof BusinessProfileInput>) {
  if (!can(ctx, "settings.manage")) throw forbidden();
  const logo = cleanImageUrl(ctx, input.logoUrl);
  await inBusiness(ctx, async (tx) => {
    await tx.execute(sql`
      INSERT INTO fnb.settings (business_id, business_logo_url, business_address, business_city, public_menu_enabled)
      VALUES (${ctx.businessId}::uuid, ${logo}, ${input.address || null}, ${input.city || null}, ${input.publicMenuEnabled})
      ON CONFLICT (business_id) DO UPDATE SET business_logo_url = EXCLUDED.business_logo_url, business_address = EXCLUDED.business_address,
        business_city = EXCLUDED.business_city, public_menu_enabled = EXCLUDED.public_menu_enabled, updated_at = now()`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.business_profile.updated", targetType: "business", targetId: ctx.businessId, meta: { logo: Boolean(logo), publicMenu: input.publicMenuEnabled } });
  });
}
