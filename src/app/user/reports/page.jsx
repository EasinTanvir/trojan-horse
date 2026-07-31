"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportList } from "@/components/reports/ReportList";
import { buttonClasses } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/icons";
import { castVote } from "@/actions/votes";
import { useReports } from "@/hooks/useReports";
import { notifyError, notifySuccess } from "@/lib/toast";

/**
 * The citizen's own submissions — the same ReportList the authority queues use,
 * with `role="user"` swapping the status controls for the confirm action.
 */
export default function MyReportsPage() {
  const [filters, setFilters] = useState({ status: "", type: "" });
  const [pendingVoteId, setPendingVoteId] = useState(null);

  const { reports, meta, loading, refresh } = useReports({
    scope: "mine",
    status: filters.status,
    type: filters.type,
  });

  async function handleVote(reportId) {
    setPendingVoteId(reportId);
    try {
      const result = await castVote({ reportId });

      if (result.success) {
        notifySuccess("Confirmation recorded.");
        await refresh({ silent: true });
      } else {
        notifyError(result.error);
      }
      return result;
    } finally {
      setPendingVoteId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="My reports"
        description="Everything you've submitted, and where each one stands."
        actions={
          <Link href="/user/report/new" className={buttonClasses({ size: "sm" })}>
            <IconPlus className="size-4" />
            New report
          </Link>
        }
      />

      <div className="p-4 sm:p-6">
        <ReportList
          reports={reports}
          role="user"
          loading={loading}
          filters={filters}
          onFiltersChange={setFilters}
          total={meta?.total}
          onVote={handleVote}
          pendingVoteId={pendingVoteId}
          emptyTitle="You haven't reported anything yet"
          emptyMessage="When you submit a hazard or crime hotspot, it will show up here with its current status."
        />
      </div>
    </>
  );
}
