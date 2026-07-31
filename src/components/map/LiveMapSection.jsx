"use client";

import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import { castVote } from "@/actions/votes";
import { api } from "@/lib/axios";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useReports } from "@/hooks/useReports";
import { buildDangerZones } from "@/lib/geolocation";
import { notifyError, notifySuccess } from "@/lib/toast";

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
  isAuthenticated = false,
  className,
}) {
  const [hideSettled, setHideSettled] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [pendingVoteId, setPendingVoteId] = useState(null);
  const [routePendingId, setRoutePendingId] = useState(null);
  const [route, setRoute] = useState(null);

  /**
   * Walking route from where the viewer is standing to the selected report,
   * steered around reported hotspots where possible. Needs a live GPS fix —
   * there is no sensible "from" without one.
   */
  async function handleShowRoute(report) {
    if (!navigator.geolocation) {
      notifyError("This browser can't share your location, so no route.");
      return;
    }

    setRoutePendingId(report.id);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        });
      });

      const response = await api.get("/safe-route", {
        params: {
          fromLat: position.coords.latitude,
          fromLng: position.coords.longitude,
          toLat: report.lat,
          toLng: report.lng,
        },
      });

      const data = response.data.data;
      setRoute(data);
      notifySuccess(
        data.avoided
          ? "Route found, clear of reported danger zones."
          : "Route found, but it still passes a reported zone.",
      );
    } catch (error) {
      setRoute(null);
      notifyError(
        error?.readableMessage ??
          (error?.code === 1
            ? "Location access was blocked, so no route could be worked out."
            : "Couldn't work out a route right now."),
      );
    } finally {
      setRoutePendingId(null);
    }
  }

  const { reports, loading, refresh } = useReports({
    scope: "all",
    pageSize: 100,
  });

  /* Anyone signed in can confirm anyone's report, not just their own — the
     unique index keeps it to one vote per person per report. */
  async function handleVote(reportId) {
    setPendingVoteId(reportId);
    try {
      const result = await castVote({ reportId });
      if (result.success) {
        notifySuccess("Confirmation recorded.");
        refresh();
      } else {
        notifyError(result.error);
      }
    } finally {
      setPendingVoteId(null);
    }
  }

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
        isAuthenticated={isAuthenticated}
        pendingVoteId={pendingVoteId}
        routePendingId={routePendingId}
        route={route}
        onVote={handleVote}
        onShowRoute={handleShowRoute}
        onClearRoute={() => setRoute(null)}
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
