"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cityCorporations, reports, responseUnits, users } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canManageResponseUnits } from "@/lib/permissions";
import { isInsideRegion, regionForCityCorp } from "@/lib/city-corp-regions";
import { createUnitSchema, deleteUnitSchema } from "@/lib/validation/unitSchema";

/**
 * Management maintains its own roster of response units.
 *
 * The unit's City Corporation is always the session's own — never taken from
 * the request — so there is no way to add a station to another jurisdiction's
 * roster.
 */
export async function createResponseUnit(values) {
  const { session, error: authError } = await authorize(["management"]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canManageResponseUnits({ role: session.role })) {
    return {
      success: false,
      error: "You don't have permission to add response units.",
      data: null,
    };
  }

  const parsed = createUnitSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields and try again.",
      data: null,
    };
  }

  const { type, name, lat, lng, contactPhone, address } = parsed.data;

  try {
    const [corp] = await db
      .select({ id: cityCorporations.id, name: cityCorporations.name })
      .from(cityCorporations)
      .where(eq(cityCorporations.id, session.cityCorporationId))
      .limit(1);

    if (!corp) {
      return {
        success: false,
        error: "Your City Corporation could not be found.",
        data: null,
      };
    }

    /* Same area rule reports obey: a unit outside the corporation's own patch
       would corrupt every "nearest unit" answer it appears in. */
    const region = regionForCityCorp(corp);
    if (!isInsideRegion({ lat, lng }, region)) {
      return {
        success: false,
        error: `That location is outside ${corp.name}. Pick a point inside its area.`,
        data: null,
      };
    }

    const trimmedName = name.trim();

    const existing = await db
      .select({ id: responseUnits.id })
      .from(responseUnits)
      .where(
        and(
          eq(responseUnits.cityCorporationId, corp.id),
          eq(responseUnits.name, trimmedName),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "A unit with that name already exists here.",
        data: null,
      };
    }

    const [created] = await db
      .insert(responseUnits)
      .values({
        cityCorporationId: corp.id,
        type,
        name: trimmedName,
        lat,
        lng,
        contactPhone: contactPhone?.trim() ? contactPhone.trim() : null,
        address: address?.trim() ? address.trim() : null,
      })
      .returning({ id: responseUnits.id, name: responseUnits.name });

    revalidatePath(`/management/${corp.id}/units`);

    return {
      success: true,
      error: null,
      data: { id: created.id, name: created.name },
    };
  } catch (error) {
    console.error("createResponseUnit failed:", error);
    return {
      success: false,
      error: "Couldn't add that unit. Please try again.",
      data: null,
    };
  }
}

/**
 * Removes a unit from the roster.
 *
 * Refuses while any report is still assigned to it: deleting would either
 * break the foreign key or silently strip the routing off live work. Re-assign
 * those reports first.
 */
export async function deleteResponseUnit(values) {
  const { session, error: authError } = await authorize(["management"]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canManageResponseUnits({ role: session.role })) {
    return {
      success: false,
      error: "You don't have permission to remove response units.",
      data: null,
    };
  }

  const parsed = deleteUnitSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That request wasn't valid.", data: null };
  }

  const { unitId } = parsed.data;

  try {
    const [unit] = await db
      .select({
        id: responseUnits.id,
        name: responseUnits.name,
        cityCorporationId: responseUnits.cityCorporationId,
      })
      .from(responseUnits)
      .where(eq(responseUnits.id, unitId))
      .limit(1);

    if (!unit) {
      return { success: false, error: "That unit no longer exists.", data: null };
    }

    if (unit.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That unit belongs to a different City Corporation.",
        data: null,
      };
    }

    const assigned = await db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.assignedUnitId, unitId))
      .limit(1);

    if (assigned.length > 0) {
      return {
        success: false,
        error: `${unit.name} still has reports assigned to it. Re-dispatch those first.`,
        data: null,
      };
    }

    await db.delete(responseUnits).where(eq(responseUnits.id, unitId));

    revalidatePath(`/management/${session.cityCorporationId}/units`);

    return { success: true, error: null, data: { id: unitId, name: unit.name } };
  } catch (error) {
    console.error("deleteResponseUnit failed:", error);
    return {
      success: false,
      error: "Couldn't remove that unit. Please try again.",
      data: null,
    };
  }
}

/**
 * Creates a login for one response unit.
 *
 * Management issues these on demand rather than every unit being seeded with an
 * account — 44 logins nobody uses is noise, and each one is a credential that
 * has to be looked after.
 *
 * The generated password is returned ONCE and never stored in readable form,
 * the same way a real credential handover works. If it's lost, issue a new one.
 */
export async function createUnitLogin(values) {
  const { session, error: authError } = await authorize(["management"]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canManageResponseUnits({ role: session.role })) {
    return {
      success: false,
      error: "You don't have permission to issue unit logins.",
      data: null,
    };
  }

  const parsed = deleteUnitSchema.safeParse(values); // same shape: { unitId }
  if (!parsed.success) {
    return { success: false, error: "That request wasn't valid.", data: null };
  }

  const { unitId } = parsed.data;

  try {
    const [unit] = await db
      .select({
        id: responseUnits.id,
        name: responseUnits.name,
        type: responseUnits.type,
        cityCorporationId: responseUnits.cityCorporationId,
      })
      .from(responseUnits)
      .where(eq(responseUnits.id, unitId))
      .limit(1);

    if (!unit) {
      return { success: false, error: "That unit no longer exists.", data: null };
    }

    if (unit.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That unit belongs to a different City Corporation.",
        data: null,
      };
    }

    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.responseUnitId, unitId))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: `${unit.name} already has a login (${existing[0].email}).`,
        data: null,
      };
    }

    /* Readable, stable, derived from the unit's own name. */
    const slug = unit.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const email = `unit-${slug}@example.com`;

    const clash = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (clash.length > 0) {
      return {
        success: false,
        error: "That unit name already maps to an existing account email.",
        data: null,
      };
    }

    /* Random, shown once, stored only as a bcrypt hash. */
    const password = `${randomBytes(6).toString("base64url")}#${randomBytes(2).toString("hex")}`;
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      role: "response_unit",
      name: unit.name,
      email,
      passwordHash,
      cityCorporationId: unit.cityCorporationId,
      responseUnitId: unit.id,
    });

    revalidatePath(`/management/${session.cityCorporationId}/units`);

    return {
      success: true,
      error: null,
      /* The only time this password exists in readable form. */
      data: { email, password, unitName: unit.name },
    };
  } catch (error) {
    console.error("createUnitLogin failed:", error);
    return {
      success: false,
      error: "Couldn't create that login. Please try again.",
      data: null,
    };
  }
}
