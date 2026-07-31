import { PageHeader } from "@/components/layout/PageHeader";
import { SosAlertFeed } from "@/components/safety/SosAlertFeed";
import { requireRole } from "@/lib/session";

/**
 * SOS alerts for Management.
 *
 * 07-realtime-pusher.md originally routed SOS alerts to city_corp alone; on
 * request both authority roles now receive them. Same channel
 * (`city-corp-{id}-alerts`), same SosAlertFeed component — Management simply
 * subscribes to it too, so there is no second copy of this UI.
 */
export default async function ManagementAlertsPage({ params }) {
  const { cityCorpId } = await params;
  await requireRole(["management"], { cityCorpId });

  return (
    <>
      <PageHeader
        title="SOS alerts"
        description="Emergency triggers from citizens in your jurisdiction."
      />

      <div className="p-4 sm:p-6">
        <SosAlertFeed cityCorpId={cityCorpId} role="management" />
      </div>
    </>
  );
}
