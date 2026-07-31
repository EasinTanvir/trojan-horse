"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
  homePathForSession,
} from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validation/authSchema";

/**
 * Hand-rolled auth (06-auth.md). No NextAuth, no Clerk.
 *
 * Every action returns { success, error, data } so the calling component can
 * toast uniformly (01-architecture.md). Redirects happen on the client after
 * the toast, using the returned `redirectTo`, so the success message is
 * actually seen before navigation.
 */
const BCRYPT_ROUNDS = 10;

export async function register(values) {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields and try again.",
      data: null,
    };
  }

  const { name, email, password } = parsed.data;
  const normalisedEmail = email.trim().toLowerCase();

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalisedEmail))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "An account already exists with that email. Try signing in.",
        data: null,
      };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    /* role is hardcoded — the form must never be able to choose it. */
    const [created] = await db
      .insert(users)
      .values({
        role: "user",
        name: name.trim(),
        email: normalisedEmail,
        passwordHash,
        cityCorporationId: null,
      })
      .returning({ id: users.id, role: users.role });

    await createSession({
      userId: created.id,
      role: created.role,
      cityCorporationId: null,
    });

    return {
      success: true,
      error: null,
      data: { redirectTo: "/user/map" },
    };
  } catch (error) {
    console.error("register failed:", error);
    return {
      success: false,
      error: "Couldn't create your account. Please try again.",
      data: null,
    };
  }
}

export async function login(values) {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the highlighted fields and try again.",
      data: null,
    };
  }

  const { email, password } = parsed.data;

  try {
    const [account] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    /* Same message whether the email is unknown or the password is wrong —
       don't let this endpoint confirm which emails exist. */
    const genericFailure = {
      success: false,
      error: "That email and password don't match.",
      data: null,
    };

    if (!account) {
      /* Constant-ish work even on a miss, so timing doesn't leak existence. */
      await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
      return genericFailure;
    }

    const matches = await bcrypt.compare(password, account.passwordHash);
    if (!matches) return genericFailure;

    await createSession({
      userId: account.id,
      role: account.role,
      cityCorporationId: account.cityCorporationId,
    });

    return {
      success: true,
      error: null,
      data: {
        redirectTo: homePathForSession({
          role: account.role,
          cityCorporationId: account.cityCorporationId,
        }),
        role: account.role,
      },
    };
  } catch (error) {
    console.error("login failed:", error);
    return {
      success: false,
      error: "Couldn't sign you in right now. Please try again.",
      data: null,
    };
  }
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
