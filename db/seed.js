import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { cityCorporations, users } from "./schema.js";

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

    seeded.push({
      cityCorp: corp.name,
      cityCorpId: row.id,
      management: management.email,
      authority: authority.email,
    });
  }

  console.log("\nSeeded accounts (passwords come from .env):\n");
  for (const entry of seeded) {
    console.log(`${entry.cityCorp}  [${entry.cityCorpId}]`);
    console.log(`  management  ${entry.management}   (SEED_MANAGEMENT_PASSWORD)`);
    console.log(`  city_corp   ${entry.authority}   (SEED_CITYCORP_PASSWORD)`);
    console.log("");
  }

  console.log("Done. Re-running this script is safe — it inserts nothing new.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  });
