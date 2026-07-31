import { z } from "zod";
import { REPORT_TYPES } from "@/lib/report-meta";

/**
 * One schema, used by the client form AND re-parsed inside createReport before
 * the insert — client validation is never trusted on its own
 * (01-architecture.md).
 *
 * Field names match db/schema.js exactly (`lat`/`lng`, `photoUrl`) so the
 * parsed object drops straight into the insert.
 *
 * `photoUrl` rather than a File: the photo is uploaded to EdgeStore as soon as
 * it's chosen, and the returned URL is what gets validated and stored. The
 * reports.photo_url column is NOT NULL, so a photo is required.
 */
export const reportSchema = z
  .object({
  type: z.enum(REPORT_TYPES, "Choose what you are reporting"),
  cityCorporationId: z.uuid(
    "Select the City Corporation responsible for this area",
  ),
  description: z
    .string()
    .min(20, "Describe what you saw in at least 20 characters")
    .max(600, "Keep the description under 600 characters"),
  photoUrl: z.url("Add a photo — it's what lets the authority act on this"),
  /* Filled by the capture-location control, not typed by hand. */
  lat: z.coerce
    .number("Capture the location before submitting")
    .min(-90, "Latitude looks wrong")
    .max(90, "Latitude looks wrong"),
    lng: z.coerce
      .number("Capture the location before submitting")
      .min(-180, "Longitude looks wrong")
      .max(180, "Longitude looks wrong"),
  })
  /* Exactly (0,0) is "Null Island" — what a failed GPS fix reports rather than
     a real place. Accepting it puts a Dhaka hazard in the Gulf of Guinea and
     drags the map's auto-fit out to the whole world. */
  .refine((values) => !(values.lat === 0 && values.lng === 0), {
    message: "That didn't return a real location. Capture it again.",
    path: ["lat"],
  });
