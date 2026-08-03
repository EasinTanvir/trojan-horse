import { z } from "zod";

/**
 * Dispatching a report to a response unit.
 *
 * Its own file rather than another passenger in statusSchema.js, which already
 * carries voteSchema and sosSchema under a name that describes none of them.
 *
 * This schema decides the SHAPE of a dispatch, not who may perform one — that
 * is `canDispatchReport` in /lib/permissions.js, per the "enforced in exactly
 * one place" rule.
 */
export const dispatchSchema = z.object({
  reportId: z.uuid("That report could not be identified"),
  responseUnitId: z.uuid("Choose a unit to dispatch this to"),
  /* Same 400-character ceiling as the City Corporation status remark. */
  dispatchNote: z
    .string()
    .max(400, "Keep the note under 400 characters")
    .optional(),
});

export const clearDispatchSchema = z.object({
  reportId: z.uuid("That report could not be identified"),
});
