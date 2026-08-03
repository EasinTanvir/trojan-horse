"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canEditRemark, canTransitionStatus } from "@/lib/permissions";
import { statusUpdateSchema } from "@/lib/validation/statusSchema";

/**
 * The only path by which a report's status changes.
 *
 * Both rules come from /lib/permissions.js and are checked here even though the
 * UI already hides the controls — hiding a control is presentation, not a
 * security boundary (03-roles-permissions.md).
 */
export async function updateReportStatus(values) {
  const { session, error: authError } = await authorize([
    "management",
    "city_corp",
  ]);
  if (authError) return { success: false, error: authError, data: null };

  const parsed = statusUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That update wasn't valid.", data: null };
  }

  const { reportId, status, statusComment } = parsed.data;

  try {
    const [existing] = await db
      .select({
        id: reports.id,
        status: reports.status,
        cityCorporationId: reports.cityCorporationId,
        dispatchStatus: reports.dispatchStatus,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!existing) {
      return { success: false, error: "That report no longer exists.", data: null };
    }

    /* Jurisdiction check: a Dhaka North account can't touch Dhaka South's
       reports even with a valid report id. */
    if (existing.cityCorporationId !== session.cityCorporationId) {
      return {
        success: false,
        error: "That report belongs to a different City Corporation.",
        data: null,
      };
    }

    if (
      !canTransitionStatus({
        role: session.role,
        fromStatus: existing.status,
        toStatus: status,
      })
    ) {
      return {
        success: false,
        error:
          session.role === "management"
            ? "Management can only move a report from under review to resolved."
            : "That status change isn't allowed.",
        data: null,
      };
    }

    const patch = { status, updatedAt: new Date() };

    /* Only city_corp may write a remark. A management payload carrying one is
       ignored rather than rejected — the field isn't theirs to send. */
    if (canEditRemark({ role: session.role })) {
      patch.statusComment = statusComment?.trim() ? statusComment.trim() : null;
    }

    /* A dispatch closes itself when the work it was for is marked resolved.
       Nobody has to remember a second button, and the unit's assignment stays
       on the record rather than being cleared. */
    if (status === "resolved" && existing.dispatchStatus === "dispatched") {
      patch.dispatchStatus = "completed";
    }

    await db.update(reports).set(patch).where(eq(reports.id, reportId));

    revalidatePath(`/management/${session.cityCorporationId}/reports`);
    revalidatePath(`/city-corp/${session.cityCorporationId}/reports`);
    revalidatePath("/user/reports");

    return { success: true, error: null, data: { id: reportId, status } };
  } catch (error) {
    console.error("updateReportStatus failed:", error);
    return {
      success: false,
      error: "Couldn't update the status. Please try again.",
      data: null,
    };
  }
}
