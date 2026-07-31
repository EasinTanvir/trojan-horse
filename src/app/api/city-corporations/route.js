import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cityCorporations } from "@/db/schema";

/**
 * The City Corporation list for the report form's select and the SOS dialog.
 * Public: knowing which authorities exist is not sensitive, and the report form
 * needs it before a session is strictly required.
 */
export async function GET() {
  try {
    const rows = await db
      .select({ id: cityCorporations.id, name: cityCorporations.name })
      .from(cityCorporations)
      .orderBy(asc(cityCorporations.name));

    return Response.json({ success: true, error: null, data: rows });
  } catch (error) {
    console.error("GET /api/city-corporations failed:", error);
    return Response.json(
      {
        success: false,
        error: "Couldn't load the City Corporation list.",
        data: null,
      },
      { status: 500 },
    );
  }
}
