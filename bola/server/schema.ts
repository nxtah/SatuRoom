/** Tabel schema `bola` untuk query bertipe. Struktur sebenarnya ada di bola/migrations/*.sql. */
import { boolean, pgSchema, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const bola = pgSchema("bola");

export const staffRole = bola.enum("staff_role", ["owner", "admin", "head_coach", "coach"]);

export const staffRoles = bola.table(
  "staff_roles",
  {
    businessId: uuid("business_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    role: staffRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.role] })],
);

export const locations = bola.table("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  isPrimary: boolean("is_primary").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const onboarding = bola.table("onboarding", {
  businessId: uuid("business_id").primaryKey(),
  staffStep: text("staff_step").$type<"pending" | "done" | "skipped">().notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
