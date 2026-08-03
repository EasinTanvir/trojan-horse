import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { responseUnits } from "@/db/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { SosAlertFeed } from "@/components/safety/SosAlertFeed";
import { canReceiveSosAlerts } from "@/lib/permissions";
import { requireRole } from "@/lib/session";

/**
 * SOS alerts for this unit's City Corporation.
 *
 * Only Thanas and Fire Service units get this — a street-lighting office being
 * paged for an emergency is noise, and noise gets ignored. The check is the
 * shared canReceiveSosAlerts, so the rule lives in one place.
 */
export default async function UnitAlertsPage({ params }) {
  const { unitId } = await params;
  const session = await requireRole(["response_unit"], { unitId });

  const [unit] = await db
    .select({
      id: responseUnits.id,
      type: responseUnits.type,
      cityCorporationId: responseUnits.cityCorporationId,
    })
    .from(responseUnits)
    .where(eq(responseUnits.id, unitId))
    .limit(1);

  if (!unit) notFound();

  if (!canReceiveSosAlerts({ role: session.role, unitType: unit.type })) {
    redirect(`/unit/${unitId}/work`);
  }

  return (
    <>
      <PageHeader
        title="SOS alerts"
        description="Emergency triggers from citizens in your jurisdiction."
      />

      <div className="p-4 sm:p-6">
        <SosAlertFeed
          cityCorpId={unit.cityCorporationId}
          role="response_unit"
          unitType={unit.type}
        />
      </div>
    </>
  );
}
