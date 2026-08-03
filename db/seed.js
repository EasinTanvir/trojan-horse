import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { cityCorporations, responseUnits, users } from "./schema.js";

/**
 * Seeds the fixed accounts every panel needs before it can be demoed
 * (08-seed-scripts.md):
 *   - 2 City Corporations
 *   - 1 management account per City Corporation
 *   - 1 city_corp account per City Corporation
 *
 * Citizen (`role='user'`) accounts are never seeded — they self-register.
 *
 * Idempotent: re-running inserts nothing new and re-uses existing rows.
 * Passwords come from env vars and are hashed with the same bcrypt cost the
 * register() Server Action uses, so seeded logins behave identically.
 *
 * No sample reports are seeded. 08-seed-scripts.md asks for explicit human
 * confirmation before adding fake report data, since demo data can read as
 * faked results — ask before adding any.
 */
const BCRYPT_ROUNDS = 10;

const CITY_CORPS = [
  { name: "Dhaka North City Corporation", slug: "dhaka-north" },
  { name: "Dhaka South City Corporation", slug: "dhaka-south" },
];

/**
 * Response units — the Thanas, fire stations and City Corporation zone offices
 * Management dispatches work to. Keyed by the same slug CITY_CORPS already uses.
 *
 * These are REFERENCE DATA about real institutions, not fabricated citizen
 * activity, so the "no fake reports without confirmation" rule above does not
 * apply to them.
 *
 * ⚠ COORDINATES ARE APPROXIMATE area centres, not surveyed positions — same
 * honesty caveat as the City Corporation circles in /lib/city-corp-regions.js.
 * Every one is checked to fall inside its own corporation's circle; if you move
 * one, re-run the coordinate check in the verification steps.
 *
 * ⚠ PHONE NUMBERS ARE DELIBERATELY NULL. A wrong number on an emergency
 * dispatch screen is worse than no number: someone calls it and reaches nobody.
 * Paste verified DMP / DNCC / DSCC / Fire Service numbers into the `phone`
 * field below and re-run `npm run db:seed` — the upsert will fill them in.
 * Until then the UI falls back to 999, which is the real national number.
 */
const RESPONSE_UNITS = {
  "dhaka-north": [
    { type: "thana", name: "Gulshan Thana", lat: 23.7925, lng: 90.4078, phone: null },
    { type: "thana", name: "Banani Thana", lat: 23.7936, lng: 90.4005, phone: null },
    { type: "thana", name: "Mirpur Model Thana", lat: 23.8041, lng: 90.3654, phone: null },
    { type: "thana", name: "Uttara West Thana", lat: 23.8759, lng: 90.3795, phone: null },
    { type: "thana", name: "Tejgaon Thana", lat: 23.7639, lng: 90.3925, phone: null },
    { type: "thana", name: "Badda Thana", lat: 23.7806, lng: 90.425, phone: null },
    { type: "thana", name: "Pallabi Thana", lat: 23.8223, lng: 90.3654, phone: null },

    { type: "fire_service", name: "Mirpur Fire Station", lat: 23.8069, lng: 90.3687, phone: null },
    { type: "fire_service", name: "Uttara Fire Station", lat: 23.87, lng: 90.4, phone: null },
    { type: "fire_service", name: "Tejgaon Fire Station", lat: 23.765, lng: 90.395, phone: null },

    { type: "road_maintenance", name: "DNCC Zone-1 Road Maintenance (Uttara)", lat: 23.869, lng: 90.4, phone: null },
    { type: "road_maintenance", name: "DNCC Zone-3 Road Maintenance (Gulshan)", lat: 23.793, lng: 90.407, phone: null },
    { type: "road_maintenance", name: "DNCC Zone-5 Road Maintenance (Mirpur)", lat: 23.805, lng: 90.366, phone: null },

    { type: "waste_management", name: "DNCC Zone-1 Waste Management (Uttara)", lat: 23.872, lng: 90.396, phone: null },
    { type: "waste_management", name: "DNCC Zone-2 Waste Management (Mirpur)", lat: 23.815, lng: 90.365, phone: null },
    { type: "waste_management", name: "DNCC Zone-3 Waste Management (Gulshan)", lat: 23.795, lng: 90.41, phone: null },

    { type: "drainage", name: "Dhaka WASA Drainage — Zone 4 (Mirpur)", lat: 23.81, lng: 90.37, phone: null },
    { type: "drainage", name: "Dhaka WASA Drainage — Zone 6 (Uttara)", lat: 23.865, lng: 90.39, phone: null },
    { type: "drainage", name: "Dhaka WASA Drainage — Gulshan Division", lat: 23.79, lng: 90.415, phone: null },

    { type: "street_lighting", name: "DNCC Street Lighting — Zone 1 (Uttara)", lat: 23.868, lng: 90.398, phone: null },
    { type: "street_lighting", name: "DNCC Street Lighting — Zone 3 (Gulshan)", lat: 23.791, lng: 90.405, phone: null },
    { type: "street_lighting", name: "DNCC Street Lighting — Zone 5 (Mirpur)", lat: 23.808, lng: 90.368, phone: null },
  ],

  "dhaka-south": [
    { type: "thana", name: "Ramna Model Thana", lat: 23.7385, lng: 90.3985, phone: null },
    { type: "thana", name: "Motijheel Thana", lat: 23.733, lng: 90.418, phone: null },
    { type: "thana", name: "Dhanmondi Thana", lat: 23.745, lng: 90.376, phone: null },
    { type: "thana", name: "Kotwali Thana", lat: 23.71, lng: 90.405, phone: null },
    { type: "thana", name: "Lalbagh Thana", lat: 23.719, lng: 90.388, phone: null },
    { type: "thana", name: "Wari Thana", lat: 23.718, lng: 90.418, phone: null },
    { type: "thana", name: "Shahbagh Thana", lat: 23.738, lng: 90.395, phone: null },

    { type: "fire_service", name: "Sadarghat Fire Station", lat: 23.706, lng: 90.411, phone: null },
    { type: "fire_service", name: "Postogola Fire Station", lat: 23.695, lng: 90.435, phone: null },
    { type: "fire_service", name: "Siddique Bazar Fire Station", lat: 23.726, lng: 90.409, phone: null },

    { type: "road_maintenance", name: "DSCC Zone-1 Road Maintenance (Dhanmondi)", lat: 23.744, lng: 90.378, phone: null },
    { type: "road_maintenance", name: "DSCC Zone-2 Road Maintenance (Wari)", lat: 23.717, lng: 90.417, phone: null },
    { type: "road_maintenance", name: "DSCC Zone-4 Road Maintenance (Sutrapur)", lat: 23.708, lng: 90.42, phone: null },

    { type: "waste_management", name: "DSCC Zone-2 Waste Management (Wari)", lat: 23.7185, lng: 90.42, phone: null },
    { type: "waste_management", name: "DSCC Zone-3 Waste Management (Kotwali)", lat: 23.709, lng: 90.403, phone: null },
    { type: "waste_management", name: "DSCC Zone-5 Waste Management (Dhanmondi)", lat: 23.743, lng: 90.38, phone: null },

    { type: "drainage", name: "Dhaka WASA Drainage — Zone 1 (Motijheel)", lat: 23.732, lng: 90.417, phone: null },
    { type: "drainage", name: "Dhaka WASA Drainage — Zone 3 (Old Dhaka)", lat: 23.711, lng: 90.408, phone: null },
    { type: "drainage", name: "Dhaka WASA Drainage — Zone 5 (Dhanmondi)", lat: 23.742, lng: 90.379, phone: null },

    { type: "street_lighting", name: "DSCC Street Lighting — Zone 2 (Wari)", lat: 23.7175, lng: 90.416, phone: null },
    { type: "street_lighting", name: "DSCC Street Lighting — Zone 4 (Sutrapur)", lat: 23.707, lng: 90.419, phone: null },
    { type: "street_lighting", name: "DSCC Street Lighting — Zone 5 (Dhanmondi)", lat: 23.7425, lng: 90.3795, phone: null },
  ],
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env before running npm run db:seed.`,
    );
  }
  return value;
}

async function upsertCityCorp(name) {
  await db.insert(cityCorporations).values({ name }).onConflictDoNothing({
    target: cityCorporations.name,
  });

  const [row] = await db
    .select()
    .from(cityCorporations)
    .where(eq(cityCorporations.name, name))
    .limit(1);

  return row;
}

async function upsertStaffUser({ role, name, email, cityCorporationId, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  /* Update rather than DoNothing on conflict: still idempotent (no duplicate
     rows), but rotating SEED_*_PASSWORD in .env and re-running actually takes
     effect. With DoNothing, a changed password would be silently ignored and
     the documented demo credentials would stop working. */
  await db
    .insert(users)
    .values({ role, name, email, cityCorporationId, passwordHash })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, name, role, cityCorporationId },
    });

  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row;
}

/**
 * Update-on-conflict, like upsertStaffUser: correcting a coordinate or pasting
 * in a verified phone number and re-running must actually take effect.
 */
async function upsertResponseUnit({
  cityCorporationId,
  type,
  name,
  lat,
  lng,
  phone,
}) {
  await db
    .insert(responseUnits)
    .values({ cityCorporationId, type, name, lat, lng, contactPhone: phone })
    .onConflictDoUpdate({
      target: [responseUnits.cityCorporationId, responseUnits.name],
      set: { type, lat, lng, contactPhone: phone },
    });
}

async function main() {
  const managementPassword = requireEnv("SEED_MANAGEMENT_PASSWORD");
  const cityCorpPassword = requireEnv("SEED_CITYCORP_PASSWORD");

  console.log("Seeding City Corporations…");
  const seeded = [];

  for (const corp of CITY_CORPS) {
    const row = await upsertCityCorp(corp.name);
    console.log(`  ${corp.name} -> ${row.id}`);

    const management = await upsertStaffUser({
      role: "management",
      name: `${corp.name} — Management`,
      email: `management-${corp.slug}@example.com`,
      cityCorporationId: row.id,
      password: managementPassword,
    });

    const authority = await upsertStaffUser({
      role: "city_corp",
      name: `${corp.name} — Authority`,
      email: `citycorp-${corp.slug}@example.com`,
      cityCorporationId: row.id,
      password: cityCorpPassword,
    });

    const units = RESPONSE_UNITS[corp.slug] ?? [];
    for (const unit of units) {
      await upsertResponseUnit({ cityCorporationId: row.id, ...unit });
    }

    const byType = units.reduce((tally, unit) => {
      tally[unit.type] = (tally[unit.type] ?? 0) + 1;
      return tally;
    }, {});

    seeded.push({
      cityCorp: corp.name,
      cityCorpId: row.id,
      management: management.email,
      authority: authority.email,
      unitCount: units.length,
      byType,
    });
  }

  console.log("\nSeeded accounts (passwords come from .env):\n");
  for (const entry of seeded) {
    console.log(`${entry.cityCorp}  [${entry.cityCorpId}]`);
    console.log(`  management  ${entry.management}   (SEED_MANAGEMENT_PASSWORD)`);
    console.log(`  city_corp   ${entry.authority}   (SEED_CITYCORP_PASSWORD)`);
    console.log(`  response units: ${entry.unitCount}`);
    for (const [type, count] of Object.entries(entry.byType)) {
      console.log(`    ${type.padEnd(18)} ${count}`);
    }
    console.log("");
  }

  console.log(
    "Response unit phone numbers are intentionally NULL until verified numbers\n" +
      "are supplied — the UI falls back to 999. See RESPONSE_UNITS above.\n",
  );
  console.log("Done. Re-running this script is safe — it inserts nothing new.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  });
