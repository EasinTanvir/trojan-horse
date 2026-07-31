"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { HotspotMarker } from "./HotspotMarker";

/**
 * The Leaflet instance itself. Always reached through <MapView>, which loads
 * this without SSR — Leaflet touches `window` at import time.
 *
 * Tiles are OpenStreetMap: no API key, no billing (01-architecture.md).
 */
export default function LeafletMap({
  reports = [],
  dangerZones = [],
  center,
  zoom = 12,
  focusStatus = null,
  onSelectReport,
}) {
  /* Fit to the focused status when one is chosen, otherwise to everything.
     Rows sitting at exactly (0,0) are excluded: that's a failed GPS fix, not a
     place, and a single one would drag the bounds out to the whole globe. They
     still render, so bad data stays visible rather than being silently hidden. */
  const fitTargets = useMemo(
    () =>
      reports.filter(
        (report) =>
          !(report.lat === 0 && report.lng === 0) &&
          (!focusStatus || report.status === focusStatus),
      ),
    [reports, focusStatus],
  );

  const points = useMemo(
    () => fitTargets.map((report) => [report.lat, report.lng]),
    [fitTargets],
  );

  /* A stable signature so the fit effect re-runs when the target set really
     changes, not on every parent render. */
  const pointsKey = useMemo(
    () => `${focusStatus ?? "all"}:${points.map((p) => p.join(",")).join("|")}`,
    [points, focusStatus],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      zoomControl={false}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <ZoomControl position="bottomright" />

      <FitToMarkers points={points} pointsKey={pointsKey} />

      {dangerZones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.lat, zone.lng]}
          radius={zone.radius}
          pathOptions={{
            color: "var(--color-danger)",
            fillColor: "var(--color-danger)",
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: "4 4",
          }}
        />
      ))}

      {reports.map((report) => (
        <HotspotMarker
          key={report.id}
          report={report}
          active={focusStatus ? report.status === focusStatus : false}
          onSelect={onSelectReport}
        />
      ))}
    </MapContainer>
  );
}

/**
 * Frames the markers automatically: on first load so every report is visible
 * without manual zooming, and again whenever the legend focuses a status.
 *
 * maxZoom stops a single marker (or a tight cluster) from slamming the map to
 * street level, which loses all sense of where you are.
 */
function FitToMarkers({ points, pointsKey }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15), { animate: true });
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [56, 56],
      maxZoom: 16,
      animate: true,
    });
    /* pointsKey is the stable identity of `points`; depending on the array
       itself would re-fit on every render and fight the user's panning. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey]);

  return null;
}
