import { z } from "zod";

/**
 * Shared by the client forms and re-parsed inside the login/register Server
 * Actions. Messages are plain language, not Zod defaults —
 * "Enter a valid email", never "Invalid input: email" (05-ui-guidelines.md).
 *
 * No `phone` field: db/schema.js's users table has no phone column, and
 * 02-database-schema.md is authoritative on that.
 *
 * No role selector either — /register only ever creates role='user'.
 * Management and city_corp accounts are seeded (06-auth.md).
 */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Enter your full name").max(80, "Name is too long"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
