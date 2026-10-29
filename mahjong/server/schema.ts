import { sql } from "drizzle-orm";
import { boolean, integer, pgSchema, primaryKey, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Role } from "./permissions";

export const mahjong = pgSchema("mahjong");

export const staffRoles = mahjong.table(
  "staff_roles",
  {
    businessId: uuid("business_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    role: text("role").$type<Role>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.role] })],
);

export const venueSettings = mahjong.table("venue_settings", {
  businessId: uuid("business_id").primaryKey(),
  billingStepMin: smallint("billing_step_min").notNull().default(30),
  minMinutes: smallint("min_minutes").notNull().default(60),
  openTime: time("open_time").notNull().default("10:00"),
  closeTime: time("close_time").notNull().default("23:00"),
  discountSilver: smallint("discount_silver").notNull().default(5),
  discountGold: smallint("discount_gold").notNull().default(10),
  publicBooking: boolean("public_booking").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mjTables = mahjong.table("mj_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").$type<"auto" | "manual" | "vip">().notNull().default("auto"),
  seats: smallint("seats").notNull().default(4),
  ratePerHour: integer("rate_per_hour").notNull(),
  isMaintenance: boolean("is_maintenance").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const members = mahjong.table("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  tier: text("tier").$type<"regular" | "silver" | "gold">().notNull().default("regular"),
  note: text("note"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItems = mahjong.table("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  category: text("category").$type<"drink" | "food" | "snack" | "other">().notNull().default("drink"),
  price: integer("price").notNull(),
  stock: integer("stock"),
  isAvailable: boolean("is_available").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const invitations = mahjong.table("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  email: text("email").notNull(),
  roles: text("roles").array().$type<Role[]>().notNull(),
  invitedBy: uuid("invited_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`now() + interval '14 days'`),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
