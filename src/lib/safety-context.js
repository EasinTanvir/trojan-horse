import { desc } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { buildDangerZones, haversineDistance } from "@/lib/geolocation";
import { bearingBetween } from "@/lib/routing";

/**
 * Builds the factual safety picture the assistant is allowed to talk about.
 *
 * The model never invents danger data: everything it says about hotspots comes
 * from this snapshot of real rows. That matters more than usual here — a
 * confidently hallucinated "this street is dangerous" (or worse, "this street
 * is safe") is the failure mode that would actually hurt someone.
 */
const NEARBY_RADIUS_M = 2500;

/** Rough compass direction, for phrasing like "600m north-east of you". */
function compass(bearing) {
  const points = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];
  return points[Math.round(bearing / 45) % 8];
}

export async function buildSafetyContext({ lat, lng } = {}) {
  const rows = await db
    .select({
      id: reports.id,
      type: reports.type,
      status: reports.status,
      lat: reports.lat,
      lng: reports.lng,
      description: reports.description,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(200);

  const zones = buildDangerZones(rows);

  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasLocation) {
    return {
      hasLocation: false,
      totalReports: rows.length,
      totalZones: zones.length,
      nearby: [],
      nearbyZones: [],
    };
  }

  const here = { lat, lng };

  const nearby = rows
    .map((row) => {
      const distance = Math.round(haversineDistance(here, row));
      return {
        ...row,
        distance,
        direction: compass(bearingBetween(here, row)),
      };
    })
    .filter((row) => row.distance <= NEARBY_RADIUS_M)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 12);

  const nearbyZones = zones
    .map((zone) => {
      const distance = Math.round(haversineDistance(here, zone));
      return {
        ...zone,
        distance,
        direction: compass(bearingBetween(here, zone)),
        inside: distance <= zone.radius,
      };
    })
    .filter((zone) => zone.distance <= NEARBY_RADIUS_M)
    .sort((a, b) => a.distance - b.distance);

  return {
    hasLocation: true,
    here,
    totalReports: rows.length,
    totalZones: zones.length,
    nearby,
    nearbyZones,
  };
}

/** Compact, readable form for the prompt — cheaper and less confusing than JSON. */
export function formatSafetyContext(context) {
  if (!context.hasLocation) {
    return [
      "LOCATION: not shared by the user.",
      `DATABASE: ${context.totalReports} reports total, ${context.totalZones} danger zones citywide.`,
      "You cannot say anything about what is near this user until they share their location.",
    ].join("\n");
  }

  const lines = [
    `LOCATION: ${context.here.lat.toFixed(5)}, ${context.here.lng.toFixed(5)} (shared by the user).`,
    `DATABASE: ${context.totalReports} reports total, ${context.totalZones} danger zones citywide.`,
  ];

  const inside = context.nearbyZones.filter((z) => z.inside);
  if (inside.length > 0) {
    lines.push(
      `INSIDE A DANGER ZONE RIGHT NOW: ${inside
        .map((z) => `${z.reportCount} unresolved hotspot report(s) within ${z.radius}m`)
        .join("; ")}.`,
    );
  } else {
    lines.push("INSIDE A DANGER ZONE RIGHT NOW: no.");
  }

  if (context.nearbyZones.length === 0) {
    lines.push("NEARBY DANGER ZONES (within 2.5km): none.");
  } else {
    lines.push("NEARBY DANGER ZONES (within 2.5km):");
    for (const zone of context.nearbyZones) {
      lines.push(
        `- ${zone.distance}m ${zone.direction}${zone.inside ? " (YOU ARE INSIDE THIS)" : ""}, ${zone.reportCount} unresolved hotspot report(s), radius ${zone.radius}m`,
      );
    }
  }

  if (context.nearby.length === 0) {
    lines.push("NEARBY REPORTS (within 2.5km): none.");
  } else {
    lines.push("NEARBY REPORTS (within 2.5km):");
    for (const report of context.nearby) {
      const kind =
        report.type === "crime_hotspot" ? "crime hotspot" : "infrastructure hazard";
      lines.push(
        `- ${report.distance}m ${report.direction} · ${kind} · status ${report.status} · ${report.description.slice(0, 110)}`,
      );
    }
  }

  return lines.join("\n");
}
