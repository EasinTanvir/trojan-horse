import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { responseUnits, sosAlerts, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canReceiveSosAlerts } from "@/lib/permissions";

/**
 * SOS alert history for one City Corporation, used to populate the feed before
 * Pusher starts delivering live ones.
 *
 * Readable by both management and city_corp for their own jurisdiction — the
 * requested widening of 07-realtime-pusher.md, which originally scoped alerts
 * to city_corp alone.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cityCorpId = searchParams.get("cityCorpId");

  const session = await getSession();
  if (!session) {
    return Response.json(
      { success: false, error: "Sign in to view alerts.", data: null },
      { status: 401 },
    );
  }

  /* A unit login only qualifies if it IS an emergency responder. The type
     comes from the database, never from the request. */
  let unitType = null;
  if (session.role === "response_unit") {
    if (!session.responseUnitId) {
      return Response.json(
        { success: false, error: "You don't have permission to view alerts.", data: null },
        { status: 403 },
      );
    }
    const [unit] = await db
      .select({ type: responseUnits.type })
      .from(responseUnits)
      .where(eq(responseUnits.id, session.responseUnitId))
      .limit(1);
    unitType = unit?.type ?? null;
  }

  if (!canReceiveSosAlerts({ role: session.role, unitType })) {
    return Response.json(
      { success: false, error: "You don't have permission to view alerts.", data: null },
      { status: 403 },
    );
  }

  if (!cityCorpId || cityCorpId !== session.cityCorporationId) {
    return Response.json(
      {
        success: false,
        error: "Those alerts belong to a different City Corporation.",
        data: null,
      },
      { status: 403 },
    );
  }

  try {
    /* Two self-joins on the same table need aliases. */
    const thana = alias(responseUnits, "thana");
    const fireUnit = alias(responseUnits, "fire_unit");

    const rows = await db
      .select({
        id: sosAlerts.id,
        status: sosAlerts.status,
        lat: sosAlerts.lat,
        lng: sosAlerts.lng,
        createdAt: sosAlerts.createdAt,
        updatedAt: sosAlerts.updatedAt,
        userId: users.id,
        userName: users.name,
        thanaName: thana.name,
        thanaPhone: thana.contactPhone,
        fireName: fireUnit.name,
        firePhone: fireUnit.contactPhone,
      })
      .from(sosAlerts)
      .innerJoin(users, eq(sosAlerts.userId, users.id))
      .leftJoin(thana, eq(sosAlerts.nearestThanaId, thana.id))
      .leftJoin(fireUnit, eq(sosAlerts.nearestFireUnitId, fireUnit.id))
      .where(eq(sosAlerts.cityCorporationId, cityCorpId))
      .orderBy(desc(sosAlerts.createdAt))
      .limit(100);

    return Response.json({
      success: true,
      error: null,
      data: rows.map((row) => ({
        id: row.id,
        status: row.status,
        lat: row.lat,
        lng: row.lng,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: { id: row.userId, name: row.userName },
        nearestThana: row.thanaName
          ? { name: row.thanaName, contactPhone: row.thanaPhone }
          : null,
        nearestFireUnit: row.fireName
          ? { name: row.fireName, contactPhone: row.firePhone }
          : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/sos failed:", error);
    return Response.json(
      { success: false, error: "Couldn't load alerts.", data: null },
      { status: 500 },
    );
  }
}
