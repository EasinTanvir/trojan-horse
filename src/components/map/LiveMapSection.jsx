"use client";

import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useReports } from "@/hooks/useReports";
import { buildDangerZones } from "@/lib/geolocation";

/**
 * The live map plus its controls, shared by the public home page and the
 * citizen panel's map page so there is only one implementation to keep correct
 * (01-architecture.md, component reuse rule).
 *
 * Reads the public `scope=all` feed, which needs no session — that's what lets
 * the same component render on the signed-out home page.
 */
export function LiveMapSection({
  heightClass = "h-[60svh] min-h-96",
  showControls = true,
  className,
}) {
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

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {showControls ? (
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
              : `Showing ${visibleReports.length} of ${reports.length} ${
                  reports.length === 1 ? "report" : "reports"
                }`}
          </p>

          <button
            type="button"
            onClick={() => refresh()}
            className={cn(
              buttonClasses({ variant: "secondary", size: "sm" }),
              "ml-auto",
            )}
          >
            Refresh
          </button>
        </div>
      ) : null}

      <MapView
        reports={visibleReports}
        dangerZones={showZones ? dangerZones : []}
        className={heightClass}
      />
    </div>
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

export default LiveMapSection;
