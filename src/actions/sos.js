"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sosAlerts, users } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canTriggerSos } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";
import { SOS_EVENT, sosChannelName } from "@/lib/pusher-channels";
import { sosSchema } from "@/lib/validation/statusSchema";

/**
 * Writes the sos_alerts row, THEN publishes to Pusher — never the other way
 * round. 07-realtime-pusher.md: a dashboard must never show an alert that
 * isn't actually persisted.
 *
 * Which City Corporation receives it: 02-database-schema.md left this open
 * ("decide in Phase 2"). Decision — the citizen picks at trigger time, in the
 * SOS confirmation dialog. Deriving it from coordinates would need jurisdiction
 * polygons we don't have, and guessing wrong sends an emergency to the wrong
 * desk.
 *
 * A Pusher failure does not fail the action: the alert is already saved and
 * both dashboards will show it on their next load.
 */
export async function triggerSOS(values) {
  const { session, error: authError } = await authorize(["user"]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canTriggerSos({ role: session.role })) {
    return {
      success: false,
      error: "Only citizen accounts can trigger an SOS.",
      data: null,
    };
  }

  const parsed = sosSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error:
        "Couldn't read your location. Allow location access and try again.",
      data: null,
    };
  }

  const { cityCorporationId, lat, lng } = parsed.data;

  try {
    const [reporter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const [created] = await db
      .insert(sosAlerts)
      .values({
        userId: session.userId,
        cityCorporationId,
        lat,
        lng,
      })
      .returning({ id: sosAlerts.id, createdAt: sosAlerts.createdAt });

    /* Only now that the row exists. */
    try {
      await pusherServer.trigger(
        sosChannelName(cityCorporationId),
        SOS_EVENT,
        {
          sosId: created.id,
          userId: session.userId,
          userName: reporter?.name ?? "A citizen",
          lat,
          lng,
          createdAt: created.createdAt,
        },
      );
    } catch (pusherError) {
      console.error("SOS saved but Pusher broadcast failed:", pusherError);
    }

    return {
      success: true,
      error: null,
      data: { id: created.id, lat, lng },
    };
  } catch (error) {
    console.error("triggerSOS failed:", error);
    return {
      success: false,
      error: "Couldn't send the SOS. Please try again.",
      data: null,
    };
  }
}
