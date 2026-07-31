import { PageHeader } from "@/components/layout/PageHeader";
import { ReportQueue } from "@/components/reports/ReportQueue";
import { requireRole } from "@/lib/session";

/**
 * Management's report queue, scoped to one City Corporation.
 *
 * `role="management"` gives every row a single control — resolve — and no
 * remark field, per the hard rule in 03-roles-permissions.md. The Server Action
 * re-checks that rule regardless of what the UI renders.
 */
export default async function ManagementReportsPage({ params }) {
  const { cityCorpId } = await params;
  await requireRole(["management"], { cityCorpId });

  return (
    <>
      <PageHeader
        title="Report queue"
        description="Reports assigned to your City Corporation."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-ink-muted">
          Management can move a report from{" "}
          <span className="font-medium text-ink">under review</span> to{" "}
          <span className="font-medium text-ink">resolved</span>. Reverting a
          status and writing remarks are reserved for the City Corporation.
        </p>

        <ReportQueue
          cityCorpId={cityCorpId}
          role="management"
          emptyTitle="Nothing in the queue"
          emptyMessage="No reports have been submitted for your City Corporation yet."
        />
      </div>
    </>
  );
}
