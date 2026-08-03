"use client";

import { useState } from "react";
import { ReportList } from "./ReportList";
import { updateReportStatus } from "@/actions/status";
import { dispatchReport } from "@/actions/dispatch";
import { useReports, useResponseUnits } from "@/hooks/useReports";
import { getStatusMeta } from "@/lib/report-meta";
import { notifyError, notifySuccess } from "@/lib/toast";

/**
 * The authority-facing queue, shared by the Management and City Corporation
 * panels — the only difference is the `role` passed through to ReportList and
 * StatusUpdateForm, so neither /app/management nor /app/city-corp needs its own
 * copy (01-architecture.md, component reuse rule).
 *
 * Reads go through /api/reports via Axios; the status write is a Server Action,
 * which re-checks the transition against /lib/permissions.js.
 */
export function ReportQueue({ cityCorpId, role, emptyTitle, emptyMessage }) {
  const [filters, setFilters] = useState({ status: "", type: "" });

  const { reports, meta, loading, refresh } = useReports({
    scope: "city",
    cityCorpId,
    status: filters.status,
    type: filters.type,
  });

  /* Fetched ONCE here, not per card — 50 rows would otherwise fire 50 requests. */
  const { units } = useResponseUnits({ cityCorpId });

  async function handleDispatch(payload) {
    const result = await dispatchReport(payload);

    if (result.success) {
      notifySuccess(`Dispatched to ${result.data.unitName}.`);
      refresh();
    } else {
      notifyError(result.error);
    }

    return result;
  }

  async function handleStatusChange(payload) {
    const result = await updateReportStatus(payload);

    if (result.success) {
      const statusMeta = getStatusMeta(result.data.status);
      notifySuccess(`Report marked ${statusMeta.label.toLowerCase()}.`);
      await refresh({ silent: true });
    } else {
      notifyError(result.error);
    }

    return result;
  }

  return (
    <ReportList
      reports={reports}
      role={role}
      loading={loading}
      filters={filters}
      onFiltersChange={setFilters}
      total={meta?.total}
      onStatusChange={handleStatusChange}
      units={units}
      onDispatch={handleDispatch}
      emptyTitle={emptyTitle}
      emptyMessage={emptyMessage}
    />
  );
}

export default ReportQueue;
