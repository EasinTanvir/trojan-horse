import { PageHeader } from "@/components/layout/PageHeader";
import { SosAlertFeed } from "@/components/safety/SosAlertFeed";
import { requireRole } from "@/lib/session";

/**
 * SOS alerts for this City Corporation's jurisdiction, delivered live over
 * Pusher (07-realtime-pusher.md). Management sees the same feed from its own
 * panel — one channel, two subscribers, one component.
 */
export default async function CityCorpAlertsPage({ params }) {
  const { cityCorpId } = await params;
  await requireRole(["city_corp"], { cityCorpId });

  return (
    <>
      <PageHeader
        title="SOS alerts"
        description="Emergency triggers from citizens in your jurisdiction."
      />

      <div className="p-4 sm:p-6">
        <SosAlertFeed cityCorpId={cityCorpId} />
      </div>
    </>
  );
}
