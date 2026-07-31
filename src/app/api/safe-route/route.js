import { db } from "@/db";
import { reports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildDangerZones } from "@/lib/geolocation";
import { detourWaypointFor, zonesOnPath } from "@/lib/routing";

/**
 * Route from the caller's position to a report, steered around reported
 * danger zones where it can be.
 *
 * Routing comes from OSRM's public demo server — free and keyless, in keeping
 * with "no paid APIs anywhere". OSRM cannot be told to avoid an area, so:
 *
 *   1. ask for the direct route
 *   2. check whether it passes through a danger zone
 *   3. if it does, re-ask via a waypoint pushed clear of that zone
 *   4. report honestly whether the result actually avoids everything
 *
 * This is a detour heuristic, not true obstacle-aware routing, and the
 * response says so via `avoided`.
 */
/* The public demo server only hosts the driving profile — a /foot/ request
   silently returns car timings (~77km/h), so ask for what we actually get and
   label the result "by road" rather than pretending it's a walking estimate. */
const OSRM = "https://router.project-osrm.org/route/v1/driving";

async function fetchRoute(points) {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&alternatives=false&steps=false`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`OSRM ${response.status}`);

  const body = await response.json();
  if (body.code !== "Ok" || !body.routes?.length) {
    throw new Error(body.code ?? "no route");
  }

  const route = body.routes[0];
  return {
    /* GeoJSON is [lng, lat]; Leaflet wants { lat, lng }. */
    path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distance: Math.round(route.distance),
    duration: Math.round(route.duration),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const fromLat = Number(searchParams.get("fromLat"));
  const fromLng = Number(searchParams.get("fromLng"));
  const toLat = Number(searchParams.get("toLat"));
  const toLng = Number(searchParams.get("toLng"));

  if ([fromLat, fromLng, toLat, toLng].some((n) => !Number.isFinite(n))) {
    return Response.json(
      { success: false, error: "Missing or invalid coordinates.", data: null },
      { status: 400 },
    );
  }

  const origin = { lat: fromLat, lng: fromLng };
  const destination = { lat: toLat, lng: toLng };

  try {
    /* Danger zones are derived from live reports, same rule the client uses. */
    const rows = await db
      .select({
        id: reports.id,
        type: reports.type,
        status: reports.status,
        lat: reports.lat,
        lng: reports.lng,
      })
      .from(reports)
      .where(eq(reports.type, "crime_hotspot"));

    const zones = buildDangerZones(rows);

    const direct = await fetchRoute([origin, destination]);
    const blocking = zonesOnPath(direct.path, zones);

    if (blocking.length === 0) {
      return Response.json({
        success: true,
        error: null,
        data: { ...direct, detoured: false, avoided: true, zones: zones.length },
      });
    }

    /* Steer around the zone that sits worst across the path. */
    const waypoint = detourWaypointFor(blocking[0], origin, destination);
    const detour = await fetchRoute([origin, waypoint, destination]);
    const stillBlocked = zonesOnPath(detour.path, zones);

    /* If the detour is worse or no cleaner, keep the direct line. */
    const useDetour =
      stillBlocked.length < blocking.length && detour.distance < direct.distance * 3;

    const chosen = useDetour ? detour : direct;
    const remaining = useDetour ? stillBlocked : blocking;

    return Response.json({
      success: true,
      error: null,
      data: {
        ...chosen,
        detoured: useDetour,
        avoided: remaining.length === 0,
        zones: zones.length,
      },
    });
  } catch (error) {
    console.error("GET /api/safe-route failed:", error);
    return Response.json(
      {
        success: false,
        error: "Couldn't work out a route right now. Please try again.",
        data: null,
      },
      { status: 502 },
    );
  }
}
