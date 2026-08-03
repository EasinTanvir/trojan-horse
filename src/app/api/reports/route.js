import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cityCorporations,
  reportVotes,
  reports,
  responseUnits,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/session";
import { REPORT_STATUSES, REPORT_TYPES } from "@/lib/report-meta";

/**
 * Filtered/paginated report reads — the Axios side of the hybrid strategy in
 * 01-architecture.md. Writes never come through here; those are Server Actions.
 *
 * Query params:
 *   scope=all|mine|city|unit   (default all)
 *   cityCorpId=<uuid>     (required when scope=city)
 *   status, type          (optional filters)
 *   page, pageSize        (pagination)
 *
 * Scope rules:
 *   all   — public, the map is readable signed out (01-architecture.md)
 *   mine  — the caller's own reports
 *   city  — reports for one City Corporation; management/city_corp only, and
 *           only their own jurisdiction
 *   unit  — work dispatched to the caller's own response unit, and nothing else
 */
const MAX_PAGE_SIZE = 100;

function jsonError(message, status) {
  return Response.json({ success: false, error: message, data: null }, { status });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const scope = searchParams.get("scope") ?? "all";
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const cityCorpId = searchParams.get("cityCorpId");

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? 50) || 50),
  );

  if (status && !REPORT_STATUSES.includes(status)) {
    return jsonError("Unknown status filter.", 400);
  }
  if (type && !REPORT_TYPES.includes(type)) {
    return jsonError("Unknown type filter.", 400);
  }

  const session = await getSession();
  const filters = [];

  if (scope === "mine") {
    if (!session) return jsonError("Sign in to see your reports.", 401);
    filters.push(eq(reports.userId, session.userId));
  } else if (scope === "city") {
    if (!session) return jsonError("Sign in to view this queue.", 401);
    if (session.role !== "management" && session.role !== "city_corp") {
      return jsonError("You don't have permission to view that queue.", 403);
    }
    if (!cityCorpId || cityCorpId !== session.cityCorporationId) {
      return jsonError("That belongs to a different City Corporation.", 403);
    }
    filters.push(eq(reports.cityCorporationId, cityCorpId));
  } else if (scope === "unit") {
    if (!session) return jsonError("Sign in to see your assigned work.", 401);
    if (session.role !== "response_unit" || !session.responseUnitId) {
      return jsonError("You don't have assigned work.", 403);
    }
    filters.push(eq(reports.assignedUnitId, session.responseUnitId));
  } else if (scope !== "all") {
    return jsonError("Unknown scope.", 400);
  }

  if (status) filters.push(eq(reports.status, status));
  if (type) filters.push(eq(reports.type, type));

  const where = filters.length ? and(...filters) : undefined;

  try {
    const votesSubquery = db
      .select({
        reportId: reportVotes.reportId,
        total: count().as("total"),
      })
      .from(reportVotes)
      .groupBy(reportVotes.reportId)
      .as("vote_totals");

    const rows = await db
      .select({
        id: reports.id,
        type: reports.type,
        status: reports.status,
        statusComment: reports.statusComment,
        photoUrl: reports.photoUrl,
        lat: reports.lat,
        lng: reports.lng,
        description: reports.description,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        cityCorporationId: reports.cityCorporationId,
        cityCorporationName: cityCorporations.name,
        reporterId: users.id,
        reporterName: users.name,
        votes: sql`coalesce(${votesSubquery.total}, 0)`.mapWith(Number),
        /* Internal routing — only projected for scope=city, see below. */
        assignedUnitId: reports.assignedUnitId,
        dispatchStatus: reports.dispatchStatus,
        dispatchNote: reports.dispatchNote,
        dispatchedAt: reports.dispatchedAt,
        assignedUnitName: responseUnits.name,
        assignedUnitType: responseUnits.type,
        assignedUnitPhone: responseUnits.contactPhone,
      })
      .from(reports)
      .innerJoin(users, eq(reports.userId, users.id))
      .innerJoin(
        cityCorporations,
        eq(reports.cityCorporationId, cityCorporations.id),
      )
      .leftJoin(responseUnits, eq(reports.assignedUnitId, responseUnits.id))
      .leftJoin(votesSubquery, eq(votesSubquery.reportId, reports.id))
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await db
      .select({ total: count() })
      .from(reports)
      .where(where);

    /* Reporter identity and dispatch routing are only for the authorities
       working the queue. The public map and the citizen's own list don't need
       either, and internal routing is not the citizen's business. */
    const includeAuthorityFields = scope === "city" || scope === "unit";
    const includeReporter = includeAuthorityFields;

    const data = rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      statusComment: row.statusComment,
      photoUrl: row.photoUrl,
      lat: row.lat,
      lng: row.lng,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      cityCorporationId: row.cityCorporationId,
      cityCorporationName: row.cityCorporationName,
      votes: row.votes,
      reporter: includeReporter
        ? { id: row.reporterId, name: row.reporterName }
        : null,
      dispatchStatus: includeAuthorityFields ? row.dispatchStatus : null,
      dispatchNote: includeAuthorityFields ? row.dispatchNote : null,
      dispatchedAt: includeAuthorityFields ? row.dispatchedAt : null,
      assignedUnit:
        includeAuthorityFields && row.assignedUnitId
          ? {
              id: row.assignedUnitId,
              name: row.assignedUnitName,
              type: row.assignedUnitType,
              contactPhone: row.assignedUnitPhone,
            }
          : null,
    }));

    return Response.json({
      success: true,
      error: null,
      data,
      meta: { page, pageSize, total, hasMore: page * pageSize < total },
    });
  } catch (error) {
    console.error("GET /api/reports failed:", error);
    return jsonError("Couldn't load reports. Please try again.", 500);
  }
}
