import { PageHeader } from "@/components/layout/PageHeader";
import { UnitRoster } from "@/components/reports/UnitRoster";
import { canManageResponseUnits } from "@/lib/permissions";
import { requireRole } from "@/lib/session";

/**
 * The roster of units this Management dispatches to.
 *
 * Editable because the real world changes — a Thana opens, a zone office moves.
 * Still not a login for the units themselves: this is Management maintaining a
 * list of places, and the Server Action re-checks that on every write.
 */
export default async function ManagementUnitsPage({ params }) {
  const { cityCorpId } = await params;
  const session = await requireRole(["management"], { cityCorpId });

  return (
    <>
      <PageHeader
        title="Response units"
        description="The Thanas, fire stations and zone offices you can dispatch work to."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-ink-muted">
          Units don&rsquo;t sign in — you dispatch to them. Anything you add here
          becomes selectable on the report queue immediately and can be picked as
          the nearest station for an SOS. Leave a phone number blank unless
          you&rsquo;ve verified it; the app falls back to{" "}
          <span className="font-medium text-ink">999</span>, which is safer than
          a wrong number.
        </p>

        <UnitRoster
          cityCorpId={cityCorpId}
          canManage={canManageResponseUnits({ role: session.role })}
        />
      </div>
    </>
  );
}
