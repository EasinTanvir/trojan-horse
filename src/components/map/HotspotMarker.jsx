"use client";

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { StatusBadge } from "@/components/reports/StatusBadge";
import {
  formatCoords,
  formatRelative,
  getStatusMeta,
  getTypeMeta,
} from "@/lib/report-meta";

/**
 * Map marker for one report.
 *
 * 04-features-spec.md: shape carries the *type*, color carries the *status*.
 *   triangle -> hazard          circle -> crime_hotspot
 * Resolved and verified reports stay on the map but recede in opacity rather
 * than disappearing.
 *
 * Colors are pulled as CSS custom properties from the theme so the locked
 * status palette is never re-typed as a hex here.
 */
const RECEDED_STATUSES = new Set(["resolved", "verified"]);

export function createMarkerIcon({ type, status, pulse = false }) {
  const statusMeta = getStatusMeta(status);
  const typeMeta = getTypeMeta(type);
  const color = statusMeta.markerColor;
  const opacity = RECEDED_STATUSES.has(status) ? 0.55 : 1;

  const pulseRing = pulse
    ? `<span style="position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:9999px;background:${color}" class="animate-marker-pulse"></span>`
    : "";

  const shape =
    typeMeta.markerShape === "triangle"
      ? `<span style="position:absolute;inset:0;background:var(--color-surface);clip-path:polygon(50% 0,100% 100%,0 100%)"></span>
         <span style="position:absolute;left:2px;right:2px;top:3px;bottom:2px;background:${color};clip-path:polygon(50% 0,100% 100%,0 100%)"></span>
         <span style="position:absolute;left:50%;top:12px;width:3px;height:7px;margin-left:-1.5px;border-radius:1px;background:var(--color-surface)"></span>`
      : `<span style="position:absolute;inset:1px;border-radius:9999px;background:${color};border:2px solid var(--color-surface)"></span>
         <span style="position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:9999px;background:var(--color-surface)"></span>`;

  return L.divIcon({
    className: "nirapod-marker",
    html: `<span style="position:relative;display:block;width:28px;height:28px;opacity:${opacity};filter:drop-shadow(0 1px 2px rgb(26 31 29 / 0.35))">${pulseRing}${shape}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
    popupAnchor: [0, -24],
  });
}

export function HotspotMarker({ report, pulse = false, onSelect }) {
  const typeMeta = getTypeMeta(report.type);

  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={createMarkerIcon({
        type: report.type,
        status: report.status,
        pulse,
      })}
      alt={`${typeMeta.label}, ${getStatusMeta(report.status).label}`}
      eventHandlers={onSelect ? { click: () => onSelect(report) } : undefined}
    >
      <Popup>
        <div className="flex w-56 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-sm font-semibold text-ink">
              {typeMeta.label}
            </p>
            <StatusBadge status={report.status} size="sm" />
          </div>

          <p className="text-xs leading-relaxed text-ink-muted">
            {report.description.length > 120
              ? `${report.description.slice(0, 120)}…`
              : report.description}
          </p>

          <dl className="flex flex-col gap-0.5 text-xs text-ink-muted">
            <div className="flex justify-between gap-2">
              <dt>Authority</dt>
              <dd className="text-ink">{report.cityCorporationName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Coordinates</dt>
              <dd className="font-mono text-ink">
                {formatCoords(report.lat, report.lng)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Reported</dt>
              <dd className="text-ink">{formatRelative(report.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Confirmations</dt>
              <dd className="font-mono text-ink">{report.votes}</dd>
            </div>
          </dl>
        </div>
      </Popup>
    </Marker>
  );
}

export default HotspotMarker;
