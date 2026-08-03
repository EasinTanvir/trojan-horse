import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { responseUnits } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canViewDispatch } from "@/lib/permissions";

/**
 * The response units Management can dispatch to, scoped to one City
 * Corporation.
 *
 * Authority-only. This is internal routing information — which station covers
 * which area, and how to reach it — and citizens have no use for it. Scoped to
 * the caller's own jurisdiction for the same reason the report queue is.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cityCorpId = searchParams.get("cityCorpId");

  const session = await getSession();
  if (!session) {
    return Response.json(
      { success: false, error: "Sign in to view response units.", data: null },
      { status: 401 },
    );
  }

  if (!canViewDispatch({ role: session.role })) {
    return Response.json(
      {
        success: false,
        error: "You don't have permission to view response units.",
        data: null,
      },
      { status: 403 },
    );
  }

  if (!cityCorpId || cityCorpId !== session.cityCorporationId) {
    return Response.json(
      {
        success: false,
        error: "Those units belong to a different City Corporation.",
        data: null,
      },
      { status: 403 },
    );
  }

  try {
    const rows = await db
      .select({
        id: responseUnits.id,
        type: responseUnits.type,
        name: responseUnits.name,
        lat: responseUnits.lat,
        lng: responseUnits.lng,
        contactPhone: responseUnits.contactPhone,
        address: responseUnits.address,
      })
      .from(responseUnits)
      .where(eq(responseUnits.cityCorporationId, cityCorpId))
      .orderBy(asc(responseUnits.type), asc(responseUnits.name));

    return Response.json({ success: true, error: null, data: rows });
  } catch (error) {
    console.error("GET /api/response-units failed:", error);
    return Response.json(
      { success: false, error: "Couldn't load response units.", data: null },
      { status: 500 },
    );
  }
}
