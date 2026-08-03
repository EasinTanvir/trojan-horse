import {
  IconCheckCircle,
  IconDroplet,
  IconFlame,
  IconLightbulb,
  IconPolice,
  IconRoad,
  IconSend,
  IconTrash,
} from "@/components/ui/icons";

/**
 * Labels, tones and glyphs for response units and the dispatch lifecycle.
 *
 * Same shape as STATUS_META / TYPE_META in report-meta.js — a *_META object
 * keyed by the enum value, a derived list, an OPTIONS array and a get*Meta()
 * with a safe fallback. Kept in its own file because report-meta.js is about
 * reports, and this is about who fixes them.
 *
 * Tones are the existing Badge tones only. No new colours: 05-ui-guidelines.md
 * requires one consistent colour per meaning across the whole app.
 */
export const UNIT_TYPE_META = {
  thana: {
    value: "thana",
    label: "Thana (Police)",
    shortLabel: "Thana",
    tone: "danger",
    icon: IconPolice,
    description: "Crime, snatching, harassment and anything needing police",
  },
  fire_service: {
    value: "fire_service",
    label: "Fire Service",
    shortLabel: "Fire",
    tone: "danger",
    icon: IconFlame,
    description: "Fire, gas leaks and rescue",
  },
  road_maintenance: {
    value: "road_maintenance",
    label: "Road Maintenance",
    shortLabel: "Roads",
    tone: "under-review",
    icon: IconRoad,
    description: "Potholes, broken footpaths, road and divider works",
  },
  waste_management: {
    value: "waste_management",
    label: "Waste Management",
    shortLabel: "Waste",
    tone: "under-review",
    icon: IconTrash,
    description: "Garbage, dumping and construction dust",
  },
  drainage: {
    value: "drainage",
    label: "Drainage (WASA)",
    shortLabel: "Drainage",
    tone: "resolved",
    icon: IconDroplet,
    description: "Open manholes, blocked drains and waterlogging",
  },
  street_lighting: {
    value: "street_lighting",
    label: "Street Lighting",
    shortLabel: "Lighting",
    tone: "brand",
    icon: IconLightbulb,
    description: "Dark streets, broken lamps and exposed wiring",
  },
};

export const UNIT_TYPES = Object.keys(UNIT_TYPE_META);

export const UNIT_TYPE_OPTIONS = UNIT_TYPES.map((value) => ({
  value,
  label: UNIT_TYPE_META[value].label,
}));

export function getUnitTypeMeta(type) {
  return UNIT_TYPE_META[type] ?? UNIT_TYPE_META.road_maintenance;
}

/**
 * Dispatch lifecycle — orthogonal to report status. `status` answers the
 * citizen's "is it fixed?", this answers Management's "who has it?".
 */
export const DISPATCH_STATUS_META = {
  not_dispatched: {
    value: "not_dispatched",
    label: "Not dispatched",
    tone: "neutral",
    icon: IconSend,
    description: "No unit has been given this yet",
  },
  dispatched: {
    value: "dispatched",
    label: "Dispatched",
    tone: "under-review",
    icon: IconSend,
    description: "Assigned to a unit and waiting on them",
  },
  work_done: {
    value: "work_done",
    label: "Work done",
    tone: "brand",
    icon: IconCheckCircle,
    description: "The unit reported the work finished, awaiting Management",
  },
  completed: {
    value: "completed",
    label: "Completed",
    tone: "resolved",
    icon: IconCheckCircle,
    description: "The unit's work is done and the report was resolved",
  },
};

export const DISPATCH_STATUSES = Object.keys(DISPATCH_STATUS_META);

export function getDispatchStatusMeta(status) {
  return DISPATCH_STATUS_META[status] ?? DISPATCH_STATUS_META.not_dispatched;
}
