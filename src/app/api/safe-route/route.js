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
    let best = { route: direct, blocked: zonesOnPath(direct.path, zones) };

    if (best.blocked.length === 0) {
      return Response.json({
        success: true,
        error: null,
        data: { ...direct, detoured: false, avoided: true, zones: zones.length },
      });
    }

    /* Add one detour waypoint per blocking zone, up to three, keeping whichever
       attempt clears the most zones. Each extra waypoint costs another OSRM
       call, so this is capped rather than exhaustive. */
    const waypoints = [];
    for (const zone of best.blocked.slice(0, 3)) {
      waypoints.push(detourWaypointFor(zone, origin, destination));

      let attempt;
      try {
        attempt = await fetchRoute([origin, ...waypoints, destination]);
      } catch {
        /* A waypoint can land somewhere unroutable (water, a closed area) —
           keep the best result so far rather than failing the request. */
        break;
      }

      const blocked = zonesOnPath(attempt.path, zones);

      /* Reject wild detours: a "safe" route three times as long is not one
         anybody will actually walk. */
      if (attempt.distance > direct.distance * 3) break;

      if (blocked.length < best.blocked.length) {
        best = { route: attempt, blocked, detoured: true };
      }
      if (blocked.length === 0) break;
    }

    return Response.json({
      success: true,
      error: null,
      data: {
        ...best.route,
        detoured: Boolean(best.detoured),
        avoided: best.blocked.length === 0,
        blockedZones: best.blocked.length,
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
