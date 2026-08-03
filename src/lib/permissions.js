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
export function canReceiveSosAlerts({ role, unitType }) {
  if (role === "city_corp" || role === "management") return true;
  /* Only the unit types that actually respond to emergencies. A street-lighting
     office being paged for an SOS is noise, and noise gets ignored. */
  if (role === "response_unit") {
    return unitType === "thana" || unitType === "fire_service";
  }
  return false;
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

/**
 * Response units (Thana, Fire Service, road/waste/drainage/lighting) are
 * DISPATCH TARGETS, never principals. They have no login, no role and no panel,
 * so there is deliberately no `canUnitDoX` helper here — if one ever appears,
 * something has gone wrong with the model.
 *
 * Management dispatches; City Corporation supervises and can see the routing.
 * If City Corporation should ever be able to re-route as well, that is a
 * one-word change on this line and nowhere else in the codebase.
 */
export function canDispatchReport({ role, reportStatus }) {
  return role === "management" && reportStatus !== "resolved";
}

export function canViewDispatch({ role }) {
  return role === "management" || role === "city_corp";
}

/**
 * Management maintains its own roster of units — a new Thana opens, a zone
 * office moves. City Corporation supervises and can see the roster but doesn't
 * edit it; flip this to include city_corp if that turns out to be wrong.
 *
 * Still not a login for the unit itself: this is Management editing a list of
 * places it dispatches to.
 */
export function canManageResponseUnits({ role }) {
  return role === "management";
}

/**
 * A unit login sees ONLY work dispatched to its own unit, and the only thing it
 * can change is whether that work is finished.
 *
 * It deliberately cannot resolve or verify a report. "We finished" and "it is
 * accepted as finished" are different claims: the unit makes the first,
 * Management makes the second by resolving the report. Collapsing them would
 * remove the only check between a crew saying the job is done and a citizen
 * being told it is.
 */
export function canViewAssignedWork({ role }) {
  return role === "response_unit";
}

export function canMarkWorkDone({ role, dispatchStatus }) {
  return (
    role === "response_unit" &&
    (dispatchStatus === "dispatched" || dispatchStatus === "work_done")
  );
}
