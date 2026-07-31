import {
  IconCheckCircle,
  IconClock,
  IconCrime,
  IconHazard,
  IconShieldCheck,
} from "@/components/ui/icons";

/**
 * The single status -> (label, tone, icon) mapping for the whole app.
 *
 * 05-ui-guidelines.md requires one consistent color per status everywhere, and
 * the icon-per-status pill is the app's signature element. Read from here —
 * never re-pick a color or glyph inside a component.
 */
export const STATUS_META = {
  under_review: {
    value: "under_review",
    label: "Under review",
    tone: "under-review",
    icon: IconClock,
    /* Marker fill on the map. CSS var so no hex is duplicated. */
    markerColor: "var(--color-status-under-review)",
    description: "Received, waiting on the authority",
  },
  resolved: {
    value: "resolved",
    label: "Resolved",
    tone: "resolved",
    icon: IconCheckCircle,
    markerColor: "var(--color-status-resolved)",
    description: "The authority has acted on this",
  },
  verified: {
    value: "verified",
    label: "Verified",
    tone: "verified",
    icon: IconShieldCheck,
    markerColor: "var(--color-status-verified)",
    description: "Confirmed on the ground by the City Corporation",
  },
};

export const REPORT_STATUSES = Object.keys(STATUS_META);

export const STATUS_OPTIONS = REPORT_STATUSES.map((value) => ({
  value,
  label: STATUS_META[value].label,
}));

/** Report type -> icon + wording. Type drives marker *shape*, status drives color. */
export const TYPE_META = {
  hazard: {
    value: "hazard",
    label: "Infrastructure hazard",
    shortLabel: "Hazard",
    icon: IconHazard,
    markerShape: "triangle",
    placeholder:
      "What is broken and where exactly? e.g. open manhole on the footpath outside the school gate, no cover, no barricade.",
  },
  crime_hotspot: {
    value: "crime_hotspot",
    label: "Crime hotspot",
    shortLabel: "Crime",
    icon: IconCrime,
    markerShape: "circle",
    placeholder:
      "What happens here, and when? e.g. phone snatching from rickshaw passengers after 8pm near the alley entrance.",
  },
};

export const REPORT_TYPES = Object.keys(TYPE_META);

export const TYPE_OPTIONS = REPORT_TYPES.map((value) => ({
  value,
  label: TYPE_META[value].label,
}));

export function getStatusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.under_review;
}

export function getTypeMeta(type) {
  return TYPE_META[type] ?? TYPE_META.hazard;
}

/** "23.7772, 90.3994" — mono-spaced coordinate pair for detail rows. */
export function formatCoords(latitude, longitude) {
  if (latitude == null || longitude == null) return "—";
  return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
}

export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Dhaka",
  }).format(date);
}

/** "3h ago" — relative time for queue rows and the SOS feed. */
export function formatRelative(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    const amount = Math.floor(seconds / secondsPerUnit);
    if (amount >= 1) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        -amount,
        unit,
      );
    }
  }
  return "just now";
}
