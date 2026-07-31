import { PageHeader } from "@/components/layout/PageHeader";
import { ReportQueue } from "@/components/reports/ReportQueue";
import { requireRole } from "@/lib/session";

/**
 * City Corporation's report queue — same component as Management's, with
 * `role="city_corp"` unlocking the full status control and the remark field.
 * The only role that can set `verified` or revert a status.
 */
export default async function CityCorpReportsPage({ params }) {
  const { cityCorpId } = await params;
  await requireRole(["city_corp"], { cityCorpId });

  return (
    <>
      <PageHeader
        title="Report queue"
        description="All reports for your City Corporation, with full status control."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-ink-muted">
          You can set any status in any direction, including reverting a report
          to <span className="font-medium text-ink">under review</span>. Yours is
          the only role that can mark a report{" "}
          <span className="font-medium text-ink">verified</span> or leave a
          remark.
        </p>

        <ReportQueue
          cityCorpId={cityCorpId}
          role="city_corp"
          emptyTitle="Nothing in the queue"
          emptyMessage="No reports have been submitted for your City Corporation yet."
        />
      </div>
    </>
  );
}
