import { z } from "zod";
import { REPORT_STATUSES, SOS_STATUSES } from "@/lib/report-meta";

/**
 * Shape of a status update. This schema does NOT decide who may perform a
 * transition — that is `canTransitionStatus` in /lib/permissions.js, per
 * 03-roles-permissions.md's "enforced in exactly one place" rule.
 */
export const statusUpdateSchema = z.object({
  reportId: z.uuid("That report could not be identified"),
  status: z.enum(REPORT_STATUSES, "Choose a status"),
  statusComment: z
    .string()
    .max(400, "Keep the remark under 400 characters")
    .optional(),
});

export const voteSchema = z.object({
  reportId: z.uuid("That report could not be identified"),
});

export const sosStatusUpdateSchema = z.object({
  sosId: z.uuid("That alert could not be identified"),
  status: z.enum(SOS_STATUSES, "Choose a status"),
});

export const sosSchema = z.object({
  cityCorporationId: z.uuid("Choose which City Corporation should receive this"),
  lat: z.coerce.number("Location unavailable").min(-90).max(90),
  lng: z.coerce.number("Location unavailable").min(-180).max(180),
});
