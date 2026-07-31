import "server-only";

import Pusher from "pusher";

/**
 * Server-side Pusher client. Used in exactly one place: the triggerSOS Server
 * Action, and only AFTER the sos_alerts row is written (07-realtime-pusher.md
 * — never announce an alert that isn't persisted).
 *
 * PUSHER_SECRET has no NEXT_PUBLIC_ prefix on purpose. It was originally named
 * NEXT_PUBLIC_PUSHER_SECRET, which would have bundled the secret into client
 * JavaScript and let anyone publish fake SOS events — see 09-env-config.md.
 * `server-only` above makes reintroducing that mistake a build error.
 */
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});
