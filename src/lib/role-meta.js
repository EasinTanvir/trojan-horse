/**
 * Per-role panel chrome: nav label set + top-bar accent.
 *
 * 05-ui-guidelines.md: the three panels share one shell but differ in accent
 * color and nav labels. Accent classes are written as complete literal strings
 * so Tailwind can see them at build time — never build them by interpolation.
 *
 * Permission behavior does NOT live here; that comes from 03-roles-permissions.md
 * and (in Phase 2) /lib/permissions.js.
 */
export const ROLE_META = {
  user: {
    role: "user",
    label: "Citizen",
    accentClass: "bg-role-user",
    accentTextClass: "text-role-user",
    home: "/user/map",
    nav: [
      { href: "/user/map", label: "Live map", icon: "map" },
      { href: "/user/report/new", label: "New report", icon: "plus" },
      { href: "/user/reports", label: "My reports", icon: "list" },
    ],
  },
  management: {
    role: "management",
    label: "Management",
    accentClass: "bg-role-management",
    accentTextClass: "text-role-management",
    home: "/management/[cityCorpId]/reports",
    nav: [
      {
        href: "/management/[cityCorpId]/reports",
        label: "Report queue",
        icon: "list",
      },
      /* The roster Management dispatches to. Units have no login of their own —
         this is Management maintaining a list of places. */
      {
        href: "/management/[cityCorpId]/units",
        label: "Response units",
        icon: "send",
      },
      /* SOS alerts reach Management as well as City Corp — a widening of
         07-realtime-pusher.md, made on request. Same channel, two subscribers. */
      {
        href: "/management/[cityCorpId]/alerts",
        label: "SOS alerts",
        icon: "siren",
      },
    ],
  },
  city_corp: {
    role: "city_corp",
    label: "City Corporation",
    accentClass: "bg-role-city-corp",
    accentTextClass: "text-role-city-corp",
    home: "/city-corp/[cityCorpId]/reports",
    nav: [
      {
        href: "/city-corp/[cityCorpId]/reports",
        label: "Report queue",
        icon: "list",
      },
      { href: "/city-corp/[cityCorpId]/alerts", label: "SOS alerts", icon: "siren" },
    ],
  },
  /* A response unit sees only what was dispatched to it. Scoped by
     [unitId], not [cityCorpId] — resolveHref fills either placeholder. */
  response_unit: {
    role: "response_unit",
    label: "Response unit",
    accentClass: "bg-role-unit",
    accentTextClass: "text-role-unit",
    home: "/unit/[unitId]/work",
    nav: [
      { href: "/unit/[unitId]/work", label: "My jobs", icon: "send" },
      { href: "/unit/[unitId]/alerts", label: "SOS alerts", icon: "siren" },
    ],
  },
};

export function getRoleMeta(role) {
  return ROLE_META[role] ?? ROLE_META.user;
}

/** Fills the [cityCorpId] placeholder in a role's nav hrefs. */
export function resolveHref(href, cityCorpId, unitId) {
  return href
    .replace("[cityCorpId]", cityCorpId ?? "[cityCorpId]")
    .replace("[unitId]", unitId ?? "[unitId]");
}
