"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canMarkWorkDone } from "@/lib/permissions";
import { workDoneSchema } from "@/lib/validation/unitSchema";

/**
 * A response unit reporting that its assigned work is finished.
 *
 * This is the ONLY write a unit login can perform, and it deliberately does not
 * touch `reports.status`. The unit says "we finished"; Management says "that is
 * accepted" by resolving the report, which rolls the dispatch to `completed`.
 * Letting a crew mark its own work resolved would remove the only check between
 * those two claims — and the citizen only ever sees the second one.
 */
export async function markWorkDone(values) {
  const { session, error: authError } = await authorize(["response_unit"]);
  if (authError) return { success: false, error: authError, data: null };

  const parsed = workDoneSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That update wasn't valid.", data: null };
  }

  const { reportId, done } = parsed.data;

  try {
    const [report] = await db
      .select({
        id: reports.id,
        assignedUnitId: reports.assignedUnitId,
        dispatchStatus: reports.dispatchStatus,
        cityCorporationId: reports.cityCorporationId,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return { success: false, error: "That report no longer exists.", data: null };
    }

    /* The unit may only touch work dispatched to IT — not to a sister station,
       and not something merely inside its City Corporation. */
    if (
      !session.responseUnitId ||
      report.assignedUnitId !== session.responseUnitId
    ) {
      return {
        success: false,
        error: "That job isn't assigned to your unit.",
        data: null,
      };
    }

    if (
      !canMarkWorkDone({
        role: session.role,
        dispatchStatus: report.dispatchStatus,
      })
    ) {
      return {
        success: false,
        error:
          report.dispatchStatus === "completed"
            ? "Management has already closed this job."
            : "This job can't be updated right now.",
        data: null,
      };
    }

    const nextStatus = done ? "work_done" : "dispatched";

    await db
      .update(reports)
      .set({ dispatchStatus: nextStatus, updatedAt: new Date() })
      .where(eq(reports.id, reportId));

    revalidatePath(`/unit/${session.responseUnitId}/work`);
    revalidatePath(`/management/${report.cityCorporationId}/reports`);
    revalidatePath(`/city-corp/${report.cityCorporationId}/reports`);

    return {
      success: true,
      error: null,
      data: { id: reportId, dispatchStatus: nextStatus },
    };
  } catch (error) {
    console.error("markWorkDone failed:", error);
    return {
      success: false,
      error: "Couldn't update that job. Please try again.",
      data: null,
    };
  }
}
