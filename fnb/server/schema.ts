import { boolean, pgSchema, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
export const fnb=pgSchema("fnb");
export const staffRole=fnb.enum("staff_role",["owner","manager","cashier","server","kitchen","inventory","accounting"]);
export const outlets=fnb.table("outlets",{id:uuid("id").primaryKey().defaultRandom(),businessId:uuid("business_id").notNull(),name:text("name").notNull(),address:text("address"),isPrimary:boolean("is_primary").notNull().default(false),archivedAt:timestamp("archived_at",{withTimezone:true})});
export const staffRoles=fnb.table("staff_roles",{businessId:uuid("business_id").notNull(),membershipId:uuid("membership_id").notNull(),role:staffRole("role").notNull()},t=>[primaryKey({columns:[t.membershipId,t.role]})]);
