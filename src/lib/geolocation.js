/**
 * Client-side proximity math for danger zone alerts.
 *
 * 07-realtime-pusher.md is explicit that this needs no server involvement: the
 * browser already has the report coordinates, so the distance check runs
 * locally against watchPosition() output. No Pusher channel, no API round trip.
 */
const EARTH_RADIUS_M = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Great-circle distance between two coordinates, in metres. */
export function haversineDistance(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Danger zones are derived from the reports themselves rather than stored: any
 * unresolved crime hotspot is a zone. Nearby hotspots merge into one zone so a
 * cluster produces a single warning instead of three overlapping ones.
 */
export const DANGER_ZONE_RADIUS_M = 300;
const MERGE_DISTANCE_M = 250;

export function buildDangerZones(reports, { radius = DANGER_ZONE_RADIUS_M } = {}) {
  const hotspots = reports.filter(
    (report) => report.type === "crime_hotspot" && report.status !== "resolved",
  );

  const zones = [];

  for (const report of hotspots) {
    const point = { lat: report.lat, lng: report.lng };
    const existing = zones.find(
      (zone) => haversineDistance(zone, point) <= MERGE_DISTANCE_M,
    );

    if (existing) {
      existing.reportCount += 1;
      continue;
    }

    zones.push({
      id: report.id,
      /* Falls back to coordinates when there's no human-readable label. */
      name: report.cityCorporationName ?? "Reported hotspot",
      lat: report.lat,
      lng: report.lng,
      radius,
      reportCount: 1,
    });
  }

  return zones;
}

/** The closest zone the position is currently inside, or null. */
export function findBreachedZone(position, zones) {
  let closest = null;
  let closestDistance = Infinity;

  for (const zone of zones) {
    const distance = haversineDistance(position, zone);
    if (distance <= zone.radius && distance < closestDistance) {
      closest = zone;
      closestDistance = distance;
    }
  }

  return closest ? { zone: closest, distance: Math.round(closestDistance) } : null;
}
