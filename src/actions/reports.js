"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { authorize } from "@/lib/session";
import { canCreateReport } from "@/lib/permissions";
import { reportSchema } from "@/lib/validation/reportSchema";

/**
 * Creates a report. The photo is already in EdgeStore by this point — the form
 * uploads on file selection and sends the resulting URL, which is what
 * reports.photo_url (NOT NULL) stores.
 *
 * Re-parses through the same Zod schema the client used, per
 * 01-architecture.md: client validation is a convenience, never a boundary.
 */
export async function createReport(values) {
  const { session, error: authError } = await authorize(["user"]);
  if (authError) return { success: false, error: authError, data: null };

  if (!canCreateReport({ role: session.role })) {
    return {
      success: false,
      error: "Only citizen accounts can submit reports.",
      data: null,
    };
  }

  const parsed = reportSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields and try again.",
      data: null,
    };
  }

  try {
    const [created] = await db
      .insert(reports)
      .values({
        userId: session.userId,
        cityCorporationId: parsed.data.cityCorporationId,
        type: parsed.data.type,
        /* New reports always start here — there is no `reported` status. */
        status: "under_review",
        photoUrl: parsed.data.photoUrl,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        description: parsed.data.description.trim(),
      })
      .returning({ id: reports.id });

    revalidatePath("/user/reports");
    revalidatePath("/user/map");

    return { success: true, error: null, data: { id: created.id } };
  } catch (error) {
    console.error("createReport failed:", error);
    return {
      success: false,
      error: "Couldn't submit your report. Please try again.",
      data: null,
    };
  }
}
