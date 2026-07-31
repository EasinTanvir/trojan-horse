import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

/**
 * Shared Drizzle client over Neon's HTTP driver — no connection pooling to
 * manage, which is what Vercel's serverless functions want.
 *
 * Deliberately NOT marked `server-only`: db/seed.js runs this same client under
 * plain Node, where that package throws. Server-only enforcement lives one
 * layer up instead, in /lib/session.js and the Server Actions.
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check .env");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export { schema };
