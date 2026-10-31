/** Tabel schema `bola` untuk query bertipe. Struktur sebenarnya ada di sport/migrations/*.sql. */
import type { SportId } from "@/lib/sports";
import { boolean, date, integer, pgSchema, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const bola = pgSchema("bola");

export const staffRole = bola.enum("staff_role", ["owner", "admin", "head_coach", "coach", "treasurer"]);

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
  branchId: uuid("branch_id").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const onboarding = bola.table("onboarding", {
  businessId: uuid("business_id").primaryKey(),
  staffStep: text("staff_step").$type<"pending" | "done" | "skipped">().notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const academySettings = bola.table("academy_settings", {
  businessId: uuid("business_id").primaryKey(),
  sport: text("sport").$type<SportId>().notNull().default("football"),
  logoUrl: text("logo_url"),
  address: text("address"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = bola.table("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  locationId: uuid("location_id").notNull(),
  name: text("name").notNull(),
  ageMin: smallint("age_min"),
  ageMax: smallint("age_max"),
  programId: uuid("program_id"),
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
  position: text("position"),
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

export const schedules = bola.table("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  teamId: uuid("team_id").notNull(),
  locationId: uuid("location_id").notNull(),
  weekday: smallint("weekday").notNull(),
  startTime: text("start_time").notNull(),
  durationMin: smallint("duration_min").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionKind = bola.enum("session_kind", ["training", "match"]);
export const sessionStatus = bola.enum("session_status", ["scheduled", "cancelled"]);

export const sessions = bola.table("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  teamId: uuid("team_id").notNull(),
  locationId: uuid("location_id").notNull(),
  scheduleId: uuid("schedule_id"),
  kind: sessionKind("kind").notNull().default("training"),
  title: text("title"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: sessionStatus("status").notNull().default("scheduled"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceStatus = bola.enum("attendance_status", ["present", "excused", "sick", "absent"]);

export const attendance = bola.table(
  "attendance",
  {
    businessId: uuid("business_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    playerId: uuid("player_id").notNull(),
    status: attendanceStatus("status").notNull(),
    recordedBy: uuid("recorded_by"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.playerId] })],
);

export const invitations = bola.table("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  email: text("email").notNull(),
  roles: staffRole("roles").array().notNull(),
  teamIds: uuid("team_ids").array().notNull().default([]),
  customRoleIds: uuid("custom_role_ids").array().notNull().default([]),
  branchIds: uuid("branch_ids").array().notNull().default([]),
  invitedBy: uuid("invited_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const teamFees = bola.table("team_fees", {
  businessId: uuid("business_id").notNull(),
  teamId: uuid("team_id").primaryKey(),
  amount: integer("amount").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceStatus = bola.enum("invoice_status", ["unpaid", "paid", "waived"]);
export const paymentMethod = bola.enum("payment_method", ["cash", "transfer", "other"]);

export const invoices = bola.table("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  playerId: uuid("player_id").notNull(),
  period: date("period").notNull(),
  amount: integer("amount").notNull(),
  discount: integer("discount").notNull().default(0),
  discountNote: text("discount_note"),
  status: invoiceStatus("status").notNull().default("unpaid"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  method: paymentMethod("method"),
  recordedBy: uuid("recorded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customRoles = bola.table("custom_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffCustomRoles = bola.table(
  "staff_custom_roles",
  {
    businessId: uuid("business_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    customRoleId: uuid("custom_role_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.customRoleId] })],
);

export const branches = bola.table("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffBranches = bola.table(
  "staff_branches",
  {
    businessId: uuid("business_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    branchId: uuid("branch_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.branchId] })],
);

export const academyModules = bola.table(
  "academy_modules",
  {
    businessId: uuid("business_id").notNull(),
    module: text("module").notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.module] })],
);
