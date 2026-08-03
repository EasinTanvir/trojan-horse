import { haversineDistance } from "./geolocation";
import { UNIT_TYPE_META } from "./unit-meta";

/**
 * Works out which unit should handle a report, and which of that corporation's
 * units is nearest to it.
 *
 * ## This is a suggestion, never an automatic filing
 * The citizen never picks a unit — they don't know the difference between the
 * drainage division and the road unit, and asking would be a worse form. So the
 * description is all we have to go on, and free text is genuinely ambiguous
 * ("manhole near the police box" reads as both). Management sees the suggestion
 * pre-selected and confirms or overrides it in one click. That one tap is what
 * makes a wrong guess harmless.
 *
 * ## Why keywords and not the LLM
 * Groq is already wired up in /api/chat, but that route has to handle 429s and
 * network failures. A queue row that spins or errors because a rate limit was
 * hit is worse than a keyword match a human corrects instantly. Keep this
 * deterministic — please don't "upgrade" it to a model call.
 *
 * Runs client-side, over the unit list the queue already fetched. Same reason
 * buildDangerZones runs client-side: the browser has the data, and a round trip
 * buys nothing. The server still re-validates the chosen unit on write.
 */

/* Lowercased substrings. English, Bangla and Banglish, because that is how
   people actually type in Dhaka. */
export const UNIT_KEYWORDS = {
  drainage: [
    "manhole",
    "man hole",
    "drain",
    "sewer",
    "sewage",
    "water logging",
    "waterlogging",
    "jolabodhota",
    "jol",
    "নর্দমা",
    "ম্যানহোল",
    "জলাবদ্ধতা",
    "ড্রেন",
  ],
  street_lighting: [
    "street light",
    "streetlight",
    "lamp post",
    "lamppost",
    "light is out",
    "no light",
    "dark",
    "bulb",
    "batti",
    "বাতি",
    "অন্ধকার",
    "wiring",
    "wire",
    "electric",
  ],
  waste_management: [
    "garbage",
    "rubbish",
    "trash",
    "dustbin",
    "waste",
    "dump",
    "dust",
    "ময়লা",
    "আবর্জনা",
    "ধুলা",
    "moyla",
  ],
  road_maintenance: [
    "pothole",
    "pot hole",
    "road",
    "footpath",
    "foot path",
    "pavement",
    "divider",
    "construction",
    "rasta",
    "রাস্তা",
    "ফুটপাত",
    "খানাখন্দ",
  ],
  fire_service: [
    "fire",
    "burning",
    "smoke",
    "gas leak",
    "cylinder",
    "আগুন",
    "ধোঁয়া",
    "গ্যাস",
  ],
  thana: [
    "mugging",
    "snatching",
    "snatch",
    "robbery",
    "theft",
    "stolen",
    "harass",
    "assault",
    "knife",
    "gang",
    "ছিনতাই",
    "চুরি",
    "ডাকাতি",
  ],
};

/** Fallback when nothing matches — the broadest civic unit. */
const DEFAULT_UNIT_TYPE = "road_maintenance";

/**
 * Which kind of unit should handle this?
 * Returns { unitType, reason, confidence: "high" | "medium" | "low" }.
 */
export function suggestUnitType({ type, description = "" } = {}) {
  /* A crime hotspot is police work, whatever the wording says. */
  if (type === "crime_hotspot") {
    return {
      unitType: "thana",
      reason: "Crime hotspots always go to the police.",
      confidence: "high",
    };
  }

  const haystack = String(description).toLowerCase();

  let best = null;
  for (const [unitType, keywords] of Object.entries(UNIT_KEYWORDS)) {
    const hits = keywords.filter((word) => haystack.includes(word));
    if (hits.length === 0) continue;
    if (!best || hits.length > best.hits.length) {
      best = { unitType, hits };
    }
  }

  if (!best) {
    return {
      unitType: DEFAULT_UNIT_TYPE,
      reason:
        "Nothing in the description pointed to a specific unit, so this defaults to road maintenance — change it if that's wrong.",
      confidence: "low",
    };
  }

  const label = UNIT_TYPE_META[best.unitType]?.label ?? best.unitType;
  return {
    unitType: best.unitType,
    reason: `The description mentions “${best.hits[0]}”, which is ${label}'s work.`,
    confidence: best.hits.length > 1 ? "high" : "medium",
  };
}

/** Closest unit of a given type, or null when the corporation has none. */
export function nearestUnitOfType(point, units = [], unitType) {
  let best = null;

  for (const unit of units) {
    if (unit.type !== unitType) continue;
    const distance = haversineDistance(point, unit);
    if (!best || distance < best.distance) best = { unit, distance };
  }

  return best;
}

/** Nearest unit of any type — the fallback when the right type doesn't exist. */
function nearestAnyUnit(point, units = []) {
  let best = null;
  for (const unit of units) {
    const distance = haversineDistance(point, unit);
    if (!best || distance < best.distance) best = { unit, distance };
  }
  return best;
}

/**
 * Full suggestion for one report: which unit, how far, and why.
 * Returns null only when the corporation has no units at all.
 */
export function suggestUnit({ report, units = [] } = {}) {
  if (!report || units.length === 0) return null;

  const point = { lat: Number(report.lat), lng: Number(report.lng) };
  const { unitType, reason, confidence } = suggestUnitType(report);

  const match = nearestUnitOfType(point, units, unitType);
  if (match) {
    return { ...match, unitType, reason, confidence };
  }

  /* Right type doesn't exist here — say so rather than silently picking. */
  const fallback = nearestAnyUnit(point, units);
  if (!fallback) return null;

  const wanted = UNIT_TYPE_META[unitType]?.label ?? unitType;
  return {
    ...fallback,
    unitType: fallback.unit.type,
    reason: `No ${wanted} unit is registered for this City Corporation, so this falls back to the nearest available unit.`,
    confidence: "low",
  };
}

/** Units sorted nearest-first, each carrying its distance, for a dropdown. */
export function unitsByDistance(point, units = []) {
  return units
    .map((unit) => ({ unit, distance: haversineDistance(point, unit) }))
    .sort((a, b) => a.distance - b.distance);
}

/** "600 m" / "2.4 km" */
export function formatDistance(metres) {
  if (!Number.isFinite(metres)) return "—";
  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(1)} km`;
}
