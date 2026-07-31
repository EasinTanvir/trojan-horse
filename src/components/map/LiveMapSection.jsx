"use client";

import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import { castVote } from "@/actions/votes";
import { SafeRouteDialog } from "./SafeRouteDialog";
import { IconRoute } from "@/components/ui/icons";
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
  const [route, setRoute] = useState(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  /**
   * Route between two chosen points, steered around reported danger zones.
   * The heavy lifting is server-side in /api/safe-route.
   */
  async function findRoute({ from, to }) {
    setRouteLoading(true);
    try {
      const response = await api.get("/safe-route", {
        params: {
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
        },
      });

      const data = response.data.data;
      setRoute(data);
      setRouteOpen(false);

      if (data.avoided) {
        notifySuccess("Route found, clear of every reported danger zone.");
      } else {
        notifyError(
          `No fully clear route exists — this one still passes ${data.blockedZones} reported zone${data.blockedZones === 1 ? "" : "s"}. Take care.`,
        );
      }
    } catch (error) {
      setRoute(null);
      notifyError(
        error?.readableMessage ?? "Couldn't work out a route right now.",
      );
    } finally {
      setRouteLoading(false);
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

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setRouteOpen(true)}
                className={buttonClasses({ size: "sm" })}
              >
                <IconRoute className="size-4" />
                Safe route
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => refresh()}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      <MapView
        reports={visibleReports}
        dangerZones={showZones ? dangerZones : []}
        isAuthenticated={isAuthenticated}
        pendingVoteId={pendingVoteId}
        route={route}
        onVote={handleVote}
        onClearRoute={() => setRoute(null)}
        className={heightClass}
      />

      <SafeRouteDialog
        open={routeOpen}
        loading={routeLoading}
        onClose={() => setRouteOpen(false)}
        onSubmit={findRoute}
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
