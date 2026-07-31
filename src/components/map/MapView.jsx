"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { STATUS_META, TYPE_META } from "@/lib/report-meta";

/**
 * Map wrapper. Leaflet reads `window` on import, so the real map is loaded
 * client-side only; this component is what every panel imports.
 */
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-surface-alt">
      <p className="text-sm text-ink-muted">Loading map…</p>
    </div>
  ),
});

/* Dhaka city centre — only used until the markers load and the map self-fits. */
const DEFAULT_CENTER = { lat: 23.7806, lng: 90.4074 };

export function MapView({
  reports = [],
  dangerZones = [],
  center = DEFAULT_CENTER,
  zoom = 12,
  showLegend = true,
  isAuthenticated = false,
  pendingVoteId = null,
  routePendingId = null,
  route = null,
  onVote,
  onShowRoute,
  onClearRoute,
  onSelectReport,
  className,
}) {
  /* Which status the legend is focusing, if any. */
  const [focusStatus, setFocusStatus] = useState(null);

  const counts = useMemo(() => {
    const tally = {};
    for (const report of reports) {
      tally[report.status] = (tally[report.status] ?? 0) + 1;
    }
    return tally;
  }, [reports]);

  function toggleFocus(status) {
    setFocusStatus((current) => (current === status ? null : status));
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-card",
        className,
      )}
    >
      <LeafletMap
        reports={reports}
        dangerZones={dangerZones}
        center={center}
        zoom={zoom}
        focusStatus={focusStatus}
        isAuthenticated={isAuthenticated}
        pendingVoteId={pendingVoteId}
        routePendingId={routePendingId}
        route={route}
        onVote={onVote}
        onShowRoute={onShowRoute}
        onSelectReport={onSelectReport}
      />

      {route ? (
        <RouteSummary route={route} onClear={onClearRoute} />
      ) : null}

      {showLegend ? (
        <MapLegend
          counts={counts}
          focusStatus={focusStatus}
          onToggleFocus={toggleFocus}
          onClearFocus={() => setFocusStatus(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Shape = type, colour = status, spelled out on the map itself because someone
 * reading this under stress shouldn't have to infer the encoding.
 *
 * The status rows are buttons: choosing one frames those markers and lifts
 * them. It focuses rather than filters — the other reports stay on the map,
 * because hiding them would misrepresent what's actually out there.
 */
function MapLegend({ counts, focusStatus, onToggleFocus, onClearFocus }) {
  return (
    <div className="absolute top-3 left-3 z-1000 max-w-[calc(100%-1.5rem)] rounded-md border border-border-subtle bg-surface/95 p-2.5 shadow-card">
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-ink">Status</p>
            {focusStatus ? (
              <button
                type="button"
                onClick={onClearFocus}
                className="rounded-sm text-xs font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
              >
                Show all
              </button>
            ) : null}
          </div>

          <ul className="flex flex-col gap-0.5">
            {Object.values(STATUS_META).map((meta) => {
              const count = counts[meta.value] ?? 0;
              const isFocused = focusStatus === meta.value;

              return (
                <li key={meta.value}>
                  <button
                    type="button"
                    onClick={() => onToggleFocus(meta.value)}
                    disabled={count === 0}
                    aria-pressed={isFocused}
                    title={
                      count === 0
                        ? `No ${meta.label.toLowerCase()} reports`
                        : `Zoom to the ${count} ${meta.label.toLowerCase()} ${count === 1 ? "report" : "reports"}`
                    }
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-xs transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-45",
                      isFocused
                        ? "bg-surface-alt font-semibold text-ink"
                        : "text-ink-muted hover:bg-surface-alt hover:text-ink",
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: meta.markerColor }}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{meta.label}</span>
                    <span className="font-mono tabular-nums">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-ink">Type</p>
          <ul className="flex flex-col gap-1.5">
            {Object.values(TYPE_META).map((meta) => (
              <li
                key={meta.value}
                className="flex items-center gap-1.5 px-1.5 text-xs text-ink-muted"
              >
                <Image
                  src={`/markers/${meta.value === "hazard" ? "hazard" : "crime"}-under-review.svg`}
                  alt=""
                  width={11}
                  height={15}
                  className="shrink-0"
                />
                {meta.shortLabel}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Sits over the map while a suggested route is displayed. */
function RouteSummary({ route, onClear }) {
  const minutes = Math.max(1, Math.round(route.duration / 60));
  const km = (route.distance / 1000).toFixed(route.distance < 1000 ? 2 : 1);

  return (
    <div className="absolute right-3 bottom-3 left-3 z-1000 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border-subtle bg-surface/95 px-3 py-2.5 shadow-elevated sm:left-auto sm:max-w-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {route.avoided ? "Route clear of danger zones" : "Shortest route available"}
        </p>
        <p className="text-xs text-ink-muted">
          <span className="font-mono">{km} km</span> · about{" "}
          <span className="font-mono">{minutes} min</span> by road
          {route.detoured ? " · detoured around a hotspot" : ""}
        </p>
        {!route.avoided ? (
          <p className="mt-0.5 text-xs font-medium text-status-under-review-ink">
            This one still passes a reported zone — take care.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded-sm text-xs font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
      >
        Clear
      </button>
    </div>
  );
}

export default MapView;
