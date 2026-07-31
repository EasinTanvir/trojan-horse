/**
 * The one place status-transition and remark rules are decided.
 *
 * 03-roles-permissions.md: "This is enforced in exactly one place,
 * /lib/permissions.js, and every Server Action that touches status calls into
 * it — never re-implement this check inline in a component or a route handler."
 *
 * Deliberately dependency-free so it can be imported from a Server Action, a
 * Route Handler, or a Client Component for UI hints without pulling in the DB.
 */

/**
 * Management may only ever perform `under_review -> resolved`.
 * City Corporation may set any status from any status, in any direction.
 * Citizens may never change a status.
 */
export function canTransitionStatus({ role, fromStatus, toStatus }) {
  if (role === "city_corp") return true;
  if (role === "management") {
    return fromStatus === "under_review" && toStatus === "resolved";
  }
  return false;
}

/** Only the City Corporation may write or edit a report's remark. */
export function canEditRemark({ role }) {
  return role === "city_corp";
}

/** Which statuses a role may move a report to, given where it is now. */
export function allowedTransitions({ role, fromStatus }) {
  return ["under_review", "resolved", "verified"].filter((toStatus) =>
    canTransitionStatus({ role, fromStatus, toStatus }),
  );
}

/** Only citizens submit reports and vote. */
export function canCreateReport({ role }) {
  return role === "user";
}

export function canVote({ role }) {
  return role === "user";
}

export function canTriggerSos({ role }) {
  return role === "user";
}

/**
 * SOS alerts reach BOTH the Management and City Corporation panels for the
 * jurisdiction. This widens 07-realtime-pusher.md, which originally routed them
 * to city_corp only — changed on request; the channel is unchanged.
 */
export function canReceiveSosAlerts({ role }) {
  return role === "city_corp" || role === "management";
}

/**
 * Either authority role may move an SOS alert between pending and resolved.
 *
 * Deliberately unlike the report lifecycle, where Management is restricted to a
 * single transition: an emergency needs whoever sees it first to be able to
 * mark it handled, and there is no `verified` equivalent to protect.
 */
export function canUpdateSosStatus({ role }) {
  return role === "city_corp" || role === "management";
}
