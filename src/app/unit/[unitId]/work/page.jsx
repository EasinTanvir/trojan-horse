import { PageHeader } from "@/components/layout/PageHeader";
import { UnitWorkQueue } from "@/components/reports/UnitWorkQueue";
import { requireRole } from "@/lib/session";

/**
 * The jobs dispatched to this unit — the only reports it can see.
 *
 * A unit reports that work is finished; it cannot resolve the report itself.
 * Management confirms by resolving, which closes the dispatch.
 */
export default async function UnitWorkPage({ params }) {
  const { unitId } = await params;
  await requireRole(["response_unit"], { unitId });

  return (
    <>
      <PageHeader
        title="My jobs"
        description="Work dispatched to your unit by Management."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-ink-muted">
          Mark a job done when your crew has finished. Management confirms it and
          closes the report — that last step isn&rsquo;t yours, so a citizen is
          never told something is fixed on your word alone.
        </p>

        <UnitWorkQueue />
      </div>
    </>
  );
}
