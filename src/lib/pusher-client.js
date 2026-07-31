"use client";

import PusherJs from "pusher-js";

/**
 * Browser Pusher client, created once and shared. Only the public app key and
 * cluster are used here — those are meant to be known by the client SDK.
 *
 * Public channels, per 07-realtime-pusher.md's "default to public first for
 * hackathon speed". Upgrading to private channels means adding
 * /api/pusher-auth to validate session role + cityCorpId before authorising.
 */
let client = null;

export function getPusherClient() {
  if (client) return client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  client = new PusherJs(key, { cluster });
  return client;
}
