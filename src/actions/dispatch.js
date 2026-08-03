"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports, responseUnits } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canDispatchReport } from "@/lib/permissions";
import {
  clearDispatchSchema,
  dispatchSchema,
} from "@/lib/validation/dispatchSchema";

/**
 * Hands a report to a response unit.
 *
 * Management-only, per canDispatchReport. Follows updateReportStatus step for
 * step: authorize → parse → fetch → permission → jurisdiction → write →
 * revalidate → { success, error, data }.
 *
 * There are TWO jurisdiction checks here, not one. Checking only the report
 * would let Dhaka North's Management dispatch to a Dhaka South fire station by
 * posting a valid unit id — the UI would never offer it, but the UI is not the
 * boundary.
 */
export async function dispatchReport(values) {
  const { session, error: authError } = await authorize(["management"]);
  if (authError) return { success: false, error: authError, data: null };

  const parsed = dispatchSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That dispatch wasn't valid.", data: null };
  }

  const { reportId, responseUnitId, dispatchNote } = parsed.data;

  try {
    const [report] = await db
      .select({
        id: reports.id,
        status: reports.status,
        cityCorporationId: reports.cityCorporationId,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return { success: false, error: "That report no longer exists.", data: null };
    }

    /* Jurisdiction check #1 — the report is ours. */
    if (report.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That report belongs to a different City Corporation.",
        data: null,
      };
    }

    if (!canDispatchReport({ role: session.role, reportStatus: report.status })) {
      return {
        success: false,
        error:
          report.status === "resolved"
            ? "That report is already resolved — nothing left to dispatch."
            : "You don't have permission to dispatch reports.",
        data: null,
      };
    }

    const [unit] = await db
      .select({
        id: responseUnits.id,
        name: responseUnits.name,
        type: responseUnits.type,
        cityCorporationId: responseUnits.cityCorporationId,
      })
      .from(responseUnits)
      .where(eq(responseUnits.id, responseUnitId))
      .limit(1);

    if (!unit) {
      return { success: false, error: "That unit no longer exists.", data: null };
    }

    /* Jurisdiction check #2 — the UNIT is ours. Easy to forget, and the whole
       reason a valid-but-foreign unit id can't be smuggled in. */
    if (unit.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That unit belongs to a different City Corporation.",
        data: null,
      };
    }

    await db
      .update(reports)
      .set({
        assignedUnitId: unit.id,
        dispatchStatus: "dispatched",
        dispatchNote: dispatchNote?.trim() ? dispatchNote.trim() : null,
        dispatchedAt: new Date(),
        dispatchedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    revalidatePath(`/management/${session.cityCorporationId}/reports`);
    revalidatePath(`/city-corp/${session.cityCorporationId}/reports`);
    revalidatePath("/user/reports");

    return {
      success: true,
      error: null,
      data: {
        id: reportId,
        unitId: unit.id,
        unitName: unit.name,
        unitType: unit.type,
        dispatchStatus: "dispatched",
      },
    };
  } catch (error) {
    console.error("dispatchReport failed:", error);
    return {
      success: false,
      error: "Couldn't dispatch that report. Please try again.",
      data: null,
    };
  }
}

/** Recalls a dispatch — for when the wrong unit was picked. */
export async function clearDispatch(values) {
  const { session, error: authError } = await authorize(["management"]);
  if (authError) return { success: false, error: authError, data: null };

  const parsed = clearDispatchSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That request wasn't valid.", data: null };
  }

  const { reportId } = parsed.data;

  try {
    const [report] = await db
      .select({
        id: reports.id,
        status: reports.status,
        cityCorporationId: reports.cityCorporationId,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return { success: false, error: "That report no longer exists.", data: null };
    }

    if (report.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That report belongs to a different City Corporation.",
        data: null,
      };
    }

    if (!canDispatchReport({ role: session.role, reportStatus: report.status })) {
      return {
        success: false,
        error: "You don't have permission to change that dispatch.",
        data: null,
      };
    }

    await db
      .update(reports)
      .set({
        assignedUnitId: null,
        dispatchStatus: "not_dispatched",
        dispatchNote: null,
        dispatchedAt: null,
        dispatchedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    revalidatePath(`/management/${session.cityCorporationId}/reports`);
    revalidatePath(`/city-corp/${session.cityCorporationId}/reports`);

    return { success: true, error: null, data: { id: reportId } };
  } catch (error) {
    console.error("clearDispatch failed:", error);
    return {
      success: false,
      error: "Couldn't recall that dispatch. Please try again.",
      data: null,
    };
  }
}
