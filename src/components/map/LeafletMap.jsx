"use client";

import { Circle, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
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
  pulseZones = false,
  onSelectReport,
}) {
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
          pulse={pulseZones}
          onSelect={onSelectReport}
        />
      ))}
    </MapContainer>
  );
}
