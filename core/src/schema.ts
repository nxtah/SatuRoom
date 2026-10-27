/** Definisi tabel schema `core` untuk query bertipe. Struktur sebenarnya ada di migrations/*.sql. */
import { sql } from "drizzle-orm";
import { customType, jsonb, pgSchema, text, timestamp, uuid, bigint } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const core = pgSchema("core");

export const tokenKind = core.enum("token_kind", ["verify_email", "reset_password"]);
export const membershipStatus = core.enum("membership_status", ["active", "suspended", "removed"]);

export const users = core.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  googleSub: text("google_sub"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = core.table("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  tokenHash: bytea("token_hash").notNull(),
  product: text("product").notNull(),
  activeBusinessId: uuid("active_business_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const authTokens = core.table("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: tokenKind("kind").notNull(),
  tokenHash: bytea("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businesses = core.table("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  product: text("product").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull().default(sql`core.new_business_code()`),
  city: text("city"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = core.table("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  userId: uuid("user_id").notNull(),
  status: membershipStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = core.table("audit_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  businessId: uuid("business_id"),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
