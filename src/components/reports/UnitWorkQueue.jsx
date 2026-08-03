"use client";

import { useState } from "react";
import { markWorkDone } from "@/actions/work";
import { ReportList } from "./ReportList";
import { useReports } from "@/hooks/useReports";
import { notifyError, notifySuccess } from "@/lib/toast";

/**
 * The jobs dispatched to this unit.
 *
 * Reuses ReportList with `role="response_unit"`, so there is still exactly one
 * report card in the codebase — the role prop decides that a unit sees the
 * work-done control and neither the status control nor the dispatch control.
 *
 * Reads use scope=unit, which the API scopes to the caller's own unit; the
 * unit id is never taken from the client.
 */
export function UnitWorkQueue() {
  const [filters, setFilters] = useState({ status: "", type: "" });
  const [pendingId, setPendingId] = useState(null);

  const { reports, meta, loading, refresh } = useReports({
    scope: "unit",
    status: filters.status,
    type: filters.type,
  });

  async function handleWorkDone({ reportId, done }) {
    setPendingId(reportId);
    try {
      const result = await markWorkDone({ reportId, done });

      if (result.success) {
        notifySuccess(
          done
            ? "Marked done. Management will confirm and close it."
            : "Reopened — back on your list as in progress.",
        );
        refresh();
      } else {
        notifyError(result.error);
      }
      return result;
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ReportList
      reports={reports}
      role="response_unit"
      loading={loading}
      filters={filters}
      onFiltersChange={setFilters}
      total={meta?.total}
      onWorkDone={handleWorkDone}
      pendingWorkId={pendingId}
      emptyTitle="No jobs assigned yet"
      emptyMessage="When Management dispatches something to your unit, it appears here."
    />
  );
}

export default UnitWorkQueue;
