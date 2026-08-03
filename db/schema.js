import {
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Authoritative schema — mirrors context/02-database-schema.md exactly.
 * Do not add, rename or remove a column here without updating that file first.
 *
 * Plain JavaScript, no type exports (01-architecture.md: JS only).
 */

/**
 * `response_unit` is appended LAST for the same migration reason as sos_status:
 * Postgres can ALTER TYPE ... ADD VALUE at the end, but not in the middle.
 *
 * A response_unit account is scoped to ONE unit (users.response_unit_id) and can
 * only see work dispatched to it. It cannot change a report's status — that
 * still belongs to Management and City Corporation.
 */
export const roleEnum = pgEnum("role", [
  "user",
  "management",
  "city_corp",
  "response_unit",
]);

export const reportTypeEnum = pgEnum("report_type", [
  "hazard",
  "crime_hotspot",
]);

/* No `reported` status — it was considered and dropped. */
export const reportStatusEnum = pgEnum("report_status", [
  "under_review",
  "resolved",
  "verified",
]);

/**
 * SOS alerts carry their own lifecycle, separate from a report's three-state
 * one. Both Management and City Corporation can move an alert in any direction.
 *
 * `acknowledged` sits between pending and resolved so a responder can signal
 * "seen, on the way" — without it two operators either duplicate the response
 * or both assume the other took it.
 *
 * NOTE: append new values to the END of this array only. Postgres can
 * ALTER TYPE ... ADD VALUE an appended label, but inserting one in the middle
 * forces the type to be recreated and `drizzle-kit push` will balk. Display
 * order comes from SOS_STATUS_META in /lib/report-meta.js, not from here.
 */
export const sosStatusEnum = pgEnum("sos_status", [
  "pending",
  "resolved",
  "acknowledged",
]);

/**
 * The units that actually carry out the work. They sit under Management, which
 * sits under the City Corporation.
 *
 * Units are primarily dispatch targets. A unit MAY also have a login
 * (role='response_unit', created by Management from the roster page), but that
 * account only ever sees work dispatched to its own unit and can never change a
 * report's status — that stays with Management and City Corporation.
 */
export const responseUnitTypeEnum = pgEnum("response_unit_type", [
  "thana",
  "fire_service",
  "road_maintenance",
  "waste_management",
  "drainage",
  "street_lighting",
]);

/**
 * Dispatch is a separate lifecycle from report status, deliberately: `status`
 * answers the citizen's question ("is it fixed?"), `dispatch_status` answers
 * Management's ("who has it?"). Folding them together would break
 * canTransitionStatus, the three-column status control, the marker colours and
 * buildDangerZones' `status !== 'resolved'` filter.
 *
 * `completed` is set automatically when the report itself is resolved, so
 * nobody has to remember a second button.
 */
export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "not_dispatched",
  "dispatched",
  "completed",
  /* Appended last for migration safety. The unit says the work is done;
     Management confirms by resolving the report, which rolls this to
     `completed`. Two steps on purpose — "we finished" and "it is accepted as
     finished" are different claims, and the second isn't the unit's to make. */
  "work_done",
]);

export const cityCorporations = pgTable("city_corporations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: roleEnum("role").notNull(),
    /* null for role='user'; required for management, city_corp and
       response_unit. */
    cityCorporationId: uuid("city_corporation_id").references(
      () => cityCorporations.id,
    ),
    /* Set only for role='response_unit' — which station this login belongs to. */
    responseUnitId: uuid("response_unit_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/**
 * Thanas, fire stations and City Corporation zone offices — the actors
 * Management routes work to.
 *
 * Coordinates are approximate area centres, not surveyed positions, in the same
 * spirit as the City Corporation circles in /lib/city-corp-regions.js.
 * `contactPhone` stays null until a verified number is supplied; the UI falls
 * back to 999 rather than showing an unverified emergency number.
 */
export const responseUnits = pgTable(
  "response_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cityCorporationId: uuid("city_corporation_id")
      .notNull()
      .references(() => cityCorporations.id),
    type: responseUnitTypeEnum("type").notNull(),
    name: text("name").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    contactPhone: text("contact_phone"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("response_units_city_corporation_id_idx").on(table.cityCorporationId),
    index("response_units_type_idx").on(table.type),
    /* The seed's onConflict target — this is what keeps re-runs idempotent. */
    uniqueIndex("response_units_city_corporation_id_name_unique").on(
      table.cityCorporationId,
      table.name,
    ),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    cityCorporationId: uuid("city_corporation_id")
      .notNull()
      .references(() => cityCorporations.id),
    type: reportTypeEnum("type").notNull(),
    status: reportStatusEnum("status").notNull().default("under_review"),
    /* City Corp only, overwritten on each edit — no history table by design. */
    statusComment: text("status_comment"),
    photoUrl: text("photo_url").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    description: text("description").notNull(),
    /* Internal routing, set by Management. Never shown to the citizen. */
    assignedUnitId: uuid("assigned_unit_id").references(() => responseUnits.id),
    dispatchStatus: dispatchStatusEnum("dispatch_status")
      .notNull()
      .default("not_dispatched"),
    dispatchNote: text("dispatch_note"),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    dispatchedBy: uuid("dispatched_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_city_corporation_id_idx").on(table.cityCorporationId),
    index("reports_user_id_idx").on(table.userId),
    index("reports_status_idx").on(table.status),
    index("reports_assigned_unit_id_idx").on(table.assignedUnitId),
  ],
);

export const reportVotes = pgTable(
  "report_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    /* DB-level, so a double-submit race can't produce two votes. */
    uniqueIndex("report_votes_report_id_user_id_unique").on(
      table.reportId,
      table.userId,
    ),
  ],
);

export const sosAlerts = pgTable(
  "sos_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    cityCorporationId: uuid("city_corporation_id")
      .notNull()
      .references(() => cityCorporations.id),
    /* New alerts always arrive pending; either authority role may resolve. */
    status: sosStatusEnum("status").notNull().default("pending"),
    /* Nearest units at the moment the alert fired, so the dashboard can show
       who to call without recomputing. Nullable on purpose — an SOS must never
       fail because unit data is missing. */
    nearestThanaId: uuid("nearest_thana_id").references(() => responseUnits.id),
    nearestFireUnitId: uuid("nearest_fire_unit_id").references(
      () => responseUnits.id,
    ),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sos_alerts_city_corporation_id_idx").on(table.cityCorporationId),
    index("sos_alerts_status_idx").on(table.status),
  ],
);
