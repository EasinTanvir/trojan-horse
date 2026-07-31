"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/map/MapView";
import { buttonClasses } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/icons";
import { useReports } from "@/hooks/useReports";
import { buildDangerZones } from "@/lib/geolocation";

/**
 * Live map, reading real reports through /api/reports via the shared Axios
 * instance. Resolved and verified reports stay on the map but recede in
 * opacity, with a toggle to hide them (04-features-spec.md, Map markers).
 */
const DHAKA_CENTER = { lat: 23.7806, lng: 90.4074 };

export default function UserMapPage() {
  const [hideSettled, setHideSettled] = useState(false);
  const [showZones, setShowZones] = useState(true);

  const { reports, loading, refresh } = useReports({
    scope: "all",
    pageSize: 100,
  });

  const visibleReports = useMemo(
    () =>
      hideSettled
        ? reports.filter((report) => report.status === "under_review")
        : reports,
    [reports, hideSettled],
  );

  const dangerZones = useMemo(() => buildDangerZones(reports), [reports]);

  const center = useMemo(() => {
    if (reports.length === 0) return DHAKA_CENTER;
    return { lat: reports[0].lat, lng: reports[0].lng };
  }, [reports]);

  return (
    <>
      <PageHeader
        title="Live map"
        description="Reported hazards and crime hotspots across the city."
        actions={
          <>
            <button
              type="button"
              onClick={() => refresh()}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Refresh
            </button>
            <Link
              href="/user/report/new"
              className={buttonClasses({ size: "sm" })}
            >
              <IconPlus className="size-4" />
              Report something
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Toggle
            checked={hideSettled}
            onChange={setHideSettled}
            label="Hide resolved and verified"
          />
          <Toggle
            checked={showZones}
            onChange={setShowZones}
            label="Show danger zones"
          />
          <p className="text-sm text-ink-muted" aria-live="polite">
            {loading
              ? "Loading reports…"
              : `Showing ${visibleReports.length} of ${reports.length} reports`}
          </p>
        </div>

        <MapView
          reports={visibleReports}
          dangerZones={showZones ? dangerZones : []}
          center={center}
          zoom={12}
          className="h-[60svh] min-h-96 lg:h-[calc(100svh-19rem)]"
        />
      </div>
    </>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded-sm border-border-subtle accent-brand-primary"
      />
      {label}
    </label>
  );
}
