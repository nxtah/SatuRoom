/** Tabel schema `bola` untuk query bertipe. Struktur sebenarnya ada di bola/migrations/*.sql. */
import { boolean, date, pgSchema, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export const teams = bola.table("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  locationId: uuid("location_id").notNull(),
  name: text("name").notNull(),
  ageMin: smallint("age_min"),
  ageMax: smallint("age_max"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamCoaches = bola.table(
  "team_coaches",
  {
    businessId: uuid("business_id").notNull(),
    teamId: uuid("team_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.membershipId] })],
);

export const playerStatus = bola.enum("player_status", ["active", "inactive"]);

export const players = bola.table("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  fullName: text("full_name").notNull(),
  birthDate: date("birth_date").notNull(),
  position: text("position").$type<"kiper" | "belakang" | "tengah" | "depan">(),
  shirtNumber: smallint("shirt_number"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  status: playerStatus("status").notNull().default("active"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamPlayers = bola.table(
  "team_players",
  {
    businessId: uuid("business_id").notNull(),
    teamId: uuid("team_id").notNull(),
    playerId: uuid("player_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.playerId] })],
);
