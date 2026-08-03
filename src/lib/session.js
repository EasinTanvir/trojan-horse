import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

/**
 * Hand-rolled sessions: a signed JWT in an httpOnly cookie. No NextAuth, no
 * Clerk (06-auth.md).
 *
 * The payload carries userId, role and cityCorporationId. Because the cookie is
 * httpOnly and signed, the client can neither read nor forge it — role is only
 * ever trusted from here, never from a client-supplied value.
 */
const COOKIE_NAME = "nirapod_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short — set a long random value in .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession({
  userId,
  role,
  cityCorporationId,
  responseUnitId,
}) {
  const token = await new SignJWT({
    role,
    cityCorporationId: cityCorporationId ?? null,
    responseUnitId: responseUnitId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Reads and verifies the cookie. Returns null when signed out or when the
 * token is expired/tampered — never throws for an anonymous visitor, since the
 * public map is readable without a session.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });

    return {
      userId: payload.sub,
      role: payload.role,
      cityCorporationId: payload.cityCorporationId ?? null,
      responseUnitId: payload.responseUnitId ?? null,
    };
  } catch {
    /* Expired or tampered — treat exactly like signed out. */
    return null;
  }
}

/**
 * Guard for every protected server component and Server Action.
 *
 *   await requireRole(["management"], { cityCorpId })
 *
 * Checks the role AND, for the two scoped panels, that the session's
 * cityCorporationId matches the [cityCorpId] URL segment — a Dhaka North
 * account must never reach Dhaka South's data by editing the URL
 * (03-roles-permissions.md, Route-level enforcement).
 *
 * Redirects rather than calling next/navigation's `forbidden()`, which is still
 * experimental and needs `experimental.authInterrupts` — not something to
 * depend on for the demo.
 */
export async function requireRole(allowedRoles, { cityCorpId, unitId } = {}) {
  const session = await getSession();

  if (!session) redirect("/login?error=signin");

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.role)) redirect("/login?error=forbidden");

  if (cityCorpId && session.cityCorporationId !== cityCorpId) {
    redirect("/login?error=scope");
  }

  /* A unit login may only ever reach its own unit's pages. */
  if (unitId && session.responseUnitId !== unitId) {
    redirect("/login?error=scope");
  }

  return session;
}

/**
 * Same checks, but returns a result instead of redirecting — for Server Actions
 * and Route Handlers, which must answer with { success, error, data } rather
 * than throw a navigation.
 */
export async function authorize(allowedRoles, { cityCorpId, unitId } = {}) {
  const session = await getSession();
  if (!session) return { session: null, error: "You need to sign in first." };

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.role)) {
    return { session: null, error: "You don't have permission to do that." };
  }

  if (cityCorpId && session.cityCorporationId !== cityCorpId) {
    return {
      session: null,
      error: "That belongs to a different City Corporation.",
    };
  }

  if (unitId && session.responseUnitId !== unitId) {
    return { session: null, error: "That belongs to a different unit." };
  }

  return { session, error: null };
}

/** Where each role lands after signing in (06-auth.md). */
export function homePathForSession({ role, cityCorporationId, responseUnitId }) {
  if (role === "management") return `/management/${cityCorporationId}/reports`;
  if (role === "city_corp") return `/city-corp/${cityCorporationId}/reports`;
  if (role === "response_unit") return `/unit/${responseUnitId}/work`;
  return "/user/map";
}

export { COOKIE_NAME };
