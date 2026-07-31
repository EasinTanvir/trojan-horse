"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sosAlerts, users } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canTriggerSos, canUpdateSosStatus } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";
import { SOS_EVENT, sosChannelName } from "@/lib/pusher-channels";
import {
  sosSchema,
  sosStatusUpdateSchema,
} from "@/lib/validation/statusSchema";

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
        status: "pending",
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
          /* Always pending on arrival — the dashboards colour it from this. */
          status: "pending",
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

/**
 * Moves an alert between pending and resolved.
 *
 * Both authority roles may do this in either direction — whoever reaches the
 * emergency first marks it handled, and it can be reopened if it turns out it
 * wasn't. The jurisdiction check still applies: an alert belonging to another
 * City Corporation is not touchable, even with a valid id.
 */
export async function updateSosStatus(values) {
  const { session, error: authError } = await authorize([
    "management",
    "city_corp",
  ]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canUpdateSosStatus({ role: session.role })) {
    return {
      success: false,
      error: "You don't have permission to update alerts.",
      data: null,
    };
  }

  const parsed = sosStatusUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That update wasn't valid.", data: null };
  }

  const { sosId, status } = parsed.data;

  try {
    const [existing] = await db
      .select({
        id: sosAlerts.id,
        cityCorporationId: sosAlerts.cityCorporationId,
      })
      .from(sosAlerts)
      .where(eq(sosAlerts.id, sosId))
      .limit(1);

    if (!existing) {
      return { success: false, error: "That alert no longer exists.", data: null };
    }

    if (existing.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That alert belongs to a different City Corporation.",
        data: null,
      };
    }

    await db
      .update(sosAlerts)
      .set({ status, updatedAt: new Date() })
      .where(eq(sosAlerts.id, sosId));

    return { success: true, error: null, data: { id: sosId, status } };
  } catch (error) {
    console.error("updateSosStatus failed:", error);
    return {
      success: false,
      error: "Couldn't update the alert. Please try again.",
      data: null,
    };
  }
}
