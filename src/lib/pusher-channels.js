/**
 * Channel/event names, shared by the server trigger and the browser
 * subscribers. No credentials here, so this is safe to import from a Client
 * Component — unlike /lib/pusher.js, which holds PUSHER_SECRET.
 *
 * One channel per City Corporation (07-realtime-pusher.md), so Dhaka North's
 * dashboard never sees Dhaka South's alerts.
 */
export function sosChannelName(cityCorporationId) {
  return `city-corp-${cityCorporationId}-alerts`;
}

export const SOS_EVENT = "sos-triggered";

/**
 * Status changes ride the SAME channel, so jurisdiction isolation is unchanged
 * and no new subscription is needed. Without this, one authority resolving an
 * alert leaves the other panel showing it as still pending.
 */
export const SOS_STATUS_EVENT = "sos-status-changed";
