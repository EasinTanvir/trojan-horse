"use client";

import L from "leaflet";
import Link from "next/link";
import { Marker, Popup } from "react-leaflet";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconCheckCircle, IconRoute } from "@/components/ui/icons";
import {
  formatCoords,
  formatRelative,
  getStatusMeta,
  getTypeMeta,
} from "@/lib/report-meta";

/**
 * Map marker for one report.
 *
 * Shape carries the *type*, colour carries the *status* — unchanged encoding,
 * now drawn from real pin assets in /public/markers rather than inline divIcon
 * HTML, so the markers read as proper map pins.
 *
 * Resolved and verified reports stay on the map but recede (see
 * .marker-receded in globals.css) rather than disappearing.
 */
const RECEDED_STATUSES = new Set(["resolved", "verified"]);

/* Filenames are `${shape}-${status}.svg`; both halves come from the metadata
   maps so a new status or type can't silently point at a missing asset. */
const TYPE_SLUG = { hazard: "hazard", crime_hotspot: "crime" };

/** Cached so panning doesn't rebuild an icon per marker per render. */
const iconCache = new Map();

export function createMarkerIcon({ type, status, active = false }) {
  const typeSlug = TYPE_SLUG[type] ?? "hazard";
  const statusSlug = (getStatusMeta(status).value ?? "under_review").replace(
    /_/g,
    "-",
  );
  const receded = RECEDED_STATUSES.has(status);
  const key = `${typeSlug}-${statusSlug}-${active ? "a" : "n"}-${receded ? "r" : "f"}`;

  const cached = iconCache.get(key);
  if (cached) return cached;

  const icon = new L.Icon({
    iconUrl: `/markers/${typeSlug}-${statusSlug}.svg`,
    shadowUrl: "/markers/pin-shadow.svg",
    iconSize: active ? [40, 55] : [32, 44],
    iconAnchor: active ? [20, 55] : [16, 44],
    popupAnchor: [0, active ? -50 : -40],
    shadowSize: [32, 12],
    shadowAnchor: [10, 8],
    className: [
      "nirapod-pin",
      receded && !active ? "marker-receded" : "",
      active ? "marker-active" : "",
    ]
      .filter(Boolean)
      .join(" "),
  });

  iconCache.set(key, icon);
  return icon;
}

export function HotspotMarker({
  report,
  active = false,
  isAuthenticated = false,
  votePending = false,
  routePending = false,
  onVote,
  onShowRoute,
  onSelect,
}) {
  const typeMeta = getTypeMeta(report.type);

  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={createMarkerIcon({
        type: report.type,
        status: report.status,
        active,
      })}
      zIndexOffset={active ? 1000 : 0}
      alt={`${typeMeta.label}, ${getStatusMeta(report.status).label}`}
      eventHandlers={onSelect ? { click: () => onSelect(report) } : undefined}
    >
      <Popup>
        <div className="flex w-60 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-sm font-semibold text-ink">
              {typeMeta.label}
            </p>
            <StatusBadge status={report.status} size="sm" />
          </div>

          {report.photoUrl ? (
            <a
              href={report.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-border-subtle"
              aria-label="Open the full-size photo"
            >
              {/* Plain <img>: this renders inside a Leaflet popup, outside
                  React's normal layout flow, where next/image's sizing wrapper
                  fights the popup's auto-width. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.photoUrl}
                alt=""
                loading="lazy"
                className="h-28 w-full object-cover"
              />
            </a>
          ) : null}

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
              <dd className="font-mono text-ink">{report.votes ?? 0}</dd>
            </div>
          </dl>

          {/* Anyone signed in can confirm anyone's report — one vote per
              person per report, enforced by a unique index. */}
          {/* Steers around reported hotspots where it can — see /api/safe-route. */}
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            loading={routePending}
            onClick={() => onShowRoute?.(report)}
          >
            <IconRoute className="size-4" />
            Show safe route
          </Button>

          {isAuthenticated ? (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              loading={votePending}
              onClick={() => onVote?.(report.id)}
            >
              <IconCheckCircle className="size-4" />
              Confirm this
            </Button>
          ) : (
            <Link
              href="/login"
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                fullWidth: true,
              })}
            >
              Sign in to confirm
            </Link>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default HotspotMarker;
