"use server";

import { and, desc, eq, gt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cityCorporations, responseUnits, sosAlerts, users } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canTriggerSos, canUpdateSosStatus } from "@/lib/permissions";
import { nearestCityCorpFor } from "@/lib/city-corp-regions";
import { nearestUnitOfType } from "@/lib/unit-routing";
import { pusherServer } from "@/lib/pusher";
import {
  SOS_EVENT,
  SOS_STATUS_EVENT,
  sosChannelName,
} from "@/lib/pusher-channels";
import {
  sosSchema,
  sosStatusUpdateSchema,
} from "@/lib/validation/statusSchema";

/**
 * Writes the sos_alerts row, THEN publishes to Pusher — never the other way
 * round. 07-realtime-pusher.md: a dashboard must never show an alert that
 * isn't actually persisted.
 *
 * Which City Corporation receives it is DERIVED from the coordinates here on
 * the server. It used to be a dropdown the citizen had to operate; making a
 * frightened person pick a jurisdiction from a list was the wrong design, and
 * their browser should not be the authority on it either. The circles in
 * /lib/city-corp-regions.js are approximate, so nearestCityCorpFor always
 * returns something — an emergency must never fail to route.
 *
 * The nearest Thana and Fire Service unit are attached at the same time, so the
 * dashboard can show who to call without recomputing.
 *
 * A Pusher failure does not fail the action: the alert is already saved and
 * both dashboards will show it on their next load.
 */
/* A second tap from a panicking user is not a second emergency. */
const SOS_DEDUPE_WINDOW_MS = 2 * 60 * 1000;
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

  const { lat, lng } = parsed.data;

  try {
    /* Idempotent under a double-tap: return the alert already in flight rather
       than creating a second one or showing a red error to someone in trouble. */
    const [recent] = await db
      .select({ id: sosAlerts.id, cityCorporationId: sosAlerts.cityCorporationId })
      .from(sosAlerts)
      .where(
        and(
          eq(sosAlerts.userId, session.userId),
          ne(sosAlerts.status, "resolved"),
          gt(sosAlerts.createdAt, new Date(Date.now() - SOS_DEDUPE_WINDOW_MS)),
        ),
      )
      .orderBy(desc(sosAlerts.createdAt))
      .limit(1);

    if (recent) {
      return {
        success: true,
        error: null,
        data: { id: recent.id, lat, lng, duplicate: true },
      };
    }

    const [reporter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    /* Derive the jurisdiction rather than trusting a client-supplied one. */
    const corps = await db
      .select({ id: cityCorporations.id, name: cityCorporations.name })
      .from(cityCorporations);

    const match = nearestCityCorpFor({ lat, lng }, corps);
    if (!match) {
      return {
        success: false,
        error: "No City Corporation is configured to receive this alert.",
        data: null,
      };
    }

    const cityCorporationId = match.cityCorp.id;

    /* Nearest responders, recorded at the moment the alert fired. */
    const units = await db
      .select({
        id: responseUnits.id,
        type: responseUnits.type,
        name: responseUnits.name,
        lat: responseUnits.lat,
        lng: responseUnits.lng,
        contactPhone: responseUnits.contactPhone,
      })
      .from(responseUnits)
      .where(eq(responseUnits.cityCorporationId, cityCorporationId));

    const nearestThana = nearestUnitOfType({ lat, lng }, units, "thana");
    const nearestFire = nearestUnitOfType({ lat, lng }, units, "fire_service");

    const [created] = await db
      .insert(sosAlerts)
      .values({
        userId: session.userId,
        cityCorporationId,
        status: "pending",
        nearestThanaId: nearestThana?.unit.id ?? null,
        nearestFireUnitId: nearestFire?.unit.id ?? null,
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
          nearestThana: nearestThana
            ? {
                name: nearestThana.unit.name,
                contactPhone: nearestThana.unit.contactPhone,
                distance: Math.round(nearestThana.distance),
              }
            : null,
          nearestFireUnit: nearestFire
            ? {
                name: nearestFire.unit.name,
                contactPhone: nearestFire.unit.contactPhone,
                distance: Math.round(nearestFire.distance),
              }
            : null,
        },
      );
    } catch (pusherError) {
      console.error("SOS saved but Pusher broadcast failed:", pusherError);
    }

    return {
      success: true,
      error: null,
      data: {
        id: created.id,
        lat,
        lng,
        cityCorporationName: match.cityCorp.name,
        insideJurisdiction: match.inside,
        nearestThanaName: nearestThana?.unit.name ?? null,
      },
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

    const updatedAt = new Date();

    await db
      .update(sosAlerts)
      .set({ status, updatedAt })
      .where(eq(sosAlerts.id, sosId));

    /* Tell the other panel. Without this, one authority resolving an alert
       leaves the other still showing it as pending, and two crews get sent.
       Same nested try/catch as triggerSOS: Pusher must not fail the write. */
    try {
      await pusherServer.trigger(
        sosChannelName(existing.cityCorporationId),
        SOS_STATUS_EVENT,
        { sosId, status, updatedAt },
      );
    } catch (pusherError) {
      console.error("SOS status saved but broadcast failed:", pusherError);
    }

    revalidatePath(`/management/${session.cityCorporationId}/alerts`);
    revalidatePath(`/city-corp/${session.cityCorporationId}/alerts`);

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
