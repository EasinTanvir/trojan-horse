import { z } from "zod";
import { UNIT_TYPES } from "@/lib/unit-meta";

/**
 * Adding or removing a response unit.
 *
 * No `cityCorporationId` field on purpose — the unit always lands in the
 * session's own jurisdiction, taken from the server. Accepting one from the
 * client would let Dhaka North add units to Dhaka South's roster.
 */
export const createUnitSchema = z.object({
  type: z.enum(UNIT_TYPES, "Choose what kind of unit this is"),
  name: z
    .string()
    .min(3, "Give the unit its full name, e.g. Gulshan Thana")
    .max(120, "That name is too long"),
  lat: z.coerce
    .number("Set the unit's location")
    .min(-90, "Latitude looks wrong")
    .max(90, "Latitude looks wrong"),
  lng: z.coerce
    .number("Set the unit's location")
    .min(-180, "Longitude looks wrong")
    .max(180, "Longitude looks wrong"),
  /* Optional, and left empty rather than guessed — an unverified number on an
     emergency screen is worse than none, since the UI falls back to 999. */
  contactPhone: z
    .string()
    .max(40, "That phone number is too long")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200, "That address is too long").optional().or(z.literal("")),
});

export const deleteUnitSchema = z.object({
  unitId: z.uuid("That unit could not be identified"),
});

/** A unit flagging its assigned work finished (or undoing that). */
export const workDoneSchema = z.object({
  reportId: z.uuid("That report could not be identified"),
  done: z.boolean(),
});
