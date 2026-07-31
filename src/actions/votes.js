"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reportVotes, reports } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canVote } from "@/lib/permissions";
import { voteSchema } from "@/lib/validation/statusSchema";

/**
 * One confirmation per user per report. The unique index on
 * (report_id, user_id) is the real guarantee — the pre-check below is only
 * there to produce a friendly message instead of a constraint error, and the
 * catch still handles the race where two submits land at once.
 */
export async function castVote(values) {
  const { session, error: authError } = await authorize(["user"]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canVote({ role: session.role })) {
    return {
      success: false,
      error: "Only citizen accounts can confirm reports.",
      data: null,
    };
  }

  const parsed = voteSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "That report couldn't be found.", data: null };
  }

  const { reportId } = parsed.data;

  try {
    const [report] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return { success: false, error: "That report no longer exists.", data: null };
    }

    const existing = await db
      .select({ id: reportVotes.id })
      .from(reportVotes)
      .where(
        and(
          eq(reportVotes.reportId, reportId),
          eq(reportVotes.userId, session.userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "You've already confirmed this report.",
        data: null,
      };
    }

    await db
      .insert(reportVotes)
      .values({ reportId, userId: session.userId })
      .onConflictDoNothing({
        target: [reportVotes.reportId, reportVotes.userId],
      });

    revalidatePath("/user/reports");
    revalidatePath("/user/map");

    return { success: true, error: null, data: { reportId } };
  } catch (error) {
    console.error("castVote failed:", error);
    return {
      success: false,
      error: "Couldn't record your confirmation. Please try again.",
      data: null,
    };
  }
}
