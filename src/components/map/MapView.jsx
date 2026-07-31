"use client";

import dynamic from "next/dynamic";
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

/* Dhaka city centre. */
const DEFAULT_CENTER = { lat: 23.7806, lng: 90.4074 };

export function MapView({
  reports = [],
  dangerZones = [],
  center = DEFAULT_CENTER,
  zoom = 12,
  pulseZones = false,
  showLegend = true,
  onSelectReport,
  className,
}) {
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
        pulseZones={pulseZones}
        onSelectReport={onSelectReport}
      />

      {showLegend ? <MapLegend /> : null}
    </div>
  );
}

/**
 * Shape = type, color = status. Spelled out on the map itself because someone
 * reading this under stress shouldn't have to infer the encoding.
 */
function MapLegend() {
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-1000 max-w-[calc(100%-1.5rem)] rounded-md border border-border-subtle bg-surface/95 px-3 py-2.5 shadow-card">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-ink">Status</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.values(STATUS_META).map((meta) => (
              <li
                key={meta.value}
                className="flex items-center gap-1.5 text-xs text-ink-muted"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: meta.markerColor }}
                  aria-hidden="true"
                />
                {meta.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-ink">Type</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.values(TYPE_META).map((meta) => {
              const Icon = meta.icon;
              return (
                <li
                  key={meta.value}
                  className="flex items-center gap-1.5 text-xs text-ink-muted"
                >
                  <Icon className="size-3.5" />
                  {meta.shortLabel}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MapView;
