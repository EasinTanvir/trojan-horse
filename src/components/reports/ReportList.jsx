"use client";

import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { IconList } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { STATUS_OPTIONS, TYPE_OPTIONS } from "@/lib/report-meta";
import { ReportCard } from "./ReportCard";

/**
 * Report collection — used by the citizen's own list and by both authority
 * queues, differing only by the `role` it forwards to ReportCard
 * (04-features-spec.md: "one component, used in all three").
 *
 * Filters are controlled by the parent, which passes them to /api/reports as
 * query params. Filtering happens in SQL, not over an already-fetched array,
 * so it stays correct once results are paginated.
 */
export function ReportList({
  reports = [],
  role = "user",
  showFilters = true,
  compact,
  loading = false,
  filters = { status: "", type: "" },
  onFiltersChange,
  total,
  emptyTitle = "No reports yet",
  emptyMessage = "Nothing has been reported here so far.",
  onVote,
  onStatusChange,
  pendingVoteId,
  className,
}) {
  const isAuthority = role === "management" || role === "city_corp";
  const dense = compact ?? isAuthority;
  const hasFilters = Boolean(filters.status || filters.type);

  function updateFilter(key, value) {
    onFiltersChange?.({ ...filters, [key]: value });
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {showFilters ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              placeholder="All statuses"
              options={STATUS_OPTIONS}
              fieldClassName="sm:w-48"
            />
            <Select
              label="Type"
              value={filters.type}
              onChange={(event) => updateFilter("type", event.target.value)}
              placeholder="All types"
              options={TYPE_OPTIONS}
              fieldClassName="sm:w-56"
            />
          </div>

          <p className="text-sm text-ink-muted sm:pb-2.5" aria-live="polite">
            {loading
              ? "Loading…"
              : `${reports.length}${
                  total != null && total !== reports.length ? ` of ${total}` : ""
                } ${reports.length === 1 ? "report" : "reports"}`}
          </p>
        </div>
      ) : null}

      {loading ? (
        <ul className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <li
              key={key}
              className="h-36 animate-pulse rounded-lg border border-border-subtle bg-surface"
            />
          ))}
        </ul>
      ) : reports.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <IconList className="size-6 text-ink-muted" />
          <p className="font-display text-base font-semibold text-ink">
            {hasFilters ? "Nothing matches these filters" : emptyTitle}
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            {hasFilters
              ? "Try clearing the status or type filter."
              : emptyMessage}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <ReportCard
                report={report}
                role={role}
                compact={dense}
                onVote={onVote}
                onStatusChange={onStatusChange}
                votePending={pendingVoteId === report.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ReportList;
