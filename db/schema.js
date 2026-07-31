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

export const roleEnum = pgEnum("role", ["user", "management", "city_corp"]);

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
 * SOS alerts carry their own two-state lifecycle, separate from a report's
 * three-state one: an alert is either still open or has been dealt with.
 * Both Management and City Corporation can move it.
 */
export const sosStatusEnum = pgEnum("sos_status", ["pending", "resolved"]);

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
    /* null for role='user'; required for management and city_corp. */
    cityCorporationId: uuid("city_corporation_id").references(
      () => cityCorporations.id,
    ),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
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
