import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sosAlerts, users } from "@/db/schema";
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

  if (!canReceiveSosAlerts({ role: session.role })) {
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
      })
      .from(sosAlerts)
      .innerJoin(users, eq(sosAlerts.userId, users.id))
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
