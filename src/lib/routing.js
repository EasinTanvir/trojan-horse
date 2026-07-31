import { haversineDistance } from "./geolocation";

/**
 * Helpers for the "safer route" suggestion.
 *
 * Honest about what this is: OSRM has no concept of an area to avoid, so we
 * route normally, check whether the line passes through a reported danger
 * zone, and if it does, re-route through a waypoint pushed out to the side of
 * that zone. It's a detour heuristic, not true obstacle-aware routing — and if
 * the detour still clips a zone, we say so rather than pretending otherwise.
 */
const EARTH_RADIUS_M = 6371000;
const toRadians = (deg) => (deg * Math.PI) / 180;
const toDegrees = (rad) => (rad * 180) / Math.PI;

/** Moves a point `distance` metres along `bearing` degrees. */
export function offsetPoint({ lat, lng }, bearing, distance) {
  const angular = distance / EARTH_RADIUS_M;
  const b = toRadians(bearing);
  const lat1 = toRadians(lat);
  const lng1 = toRadians(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(b),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(b) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDegrees(lat2), lng: toDegrees(lng2) };
}

/** Initial bearing from a to b, in degrees. */
export function bearingBetween(a, b) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/** Zones whose radius the path passes inside. */
export function zonesOnPath(path, zones, { buffer = 0 } = {}) {
  return zones.filter((zone) =>
    path.some(
      (point) => haversineDistance(point, zone) <= zone.radius + buffer,
    ),
  );
}

/**
 * A waypoint placed clear of `zone`, on whichever side of the straight
 * origin→destination line moves the route further from the zone centre.
 */
export function detourWaypointFor(zone, origin, destination) {
  const routeBearing = bearingBetween(origin, destination);
  const clearance = zone.radius * 2.2;

  const left = offsetPoint(zone, (routeBearing + 270) % 360, clearance);
  const right = offsetPoint(zone, (routeBearing + 90) % 360, clearance);

  /* Prefer the side that adds less total distance. */
  const cost = (point) =>
    haversineDistance(origin, point) + haversineDistance(point, destination);

  return cost(left) <= cost(right) ? left : right;
}
