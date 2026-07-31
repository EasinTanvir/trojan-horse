"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Map used while choosing a report's location.
 *
 * Draws the selected City Corporation's approximate service area so the
 * reporter can see where a valid pin has to land, and accepts a click anywhere
 * — the parent decides whether the point is acceptable and says so. Rejecting
 * the click silently would leave someone tapping with no idea why nothing
 * happens.
 */
const pin = new L.Icon({
  iconUrl: "/markers/hazard-under-review.svg",
  shadowUrl: "/markers/pin-shadow.svg",
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  shadowSize: [32, 12],
  shadowAnchor: [10, 8],
});

export default function LocationPickerMap({ point, region, onPick }) {
  const center = point?.lat
    ? { lat: Number(point.lat), lng: Number(point.lng) }
    : region
      ? { lat: region.lat, lng: region.lng }
      : { lat: 23.7806, lng: 90.4074 };

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={region ? 11 : 12}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {region ? (
        <Circle
          center={[region.lat, region.lng]}
          radius={region.radius}
          pathOptions={{
            color: "var(--color-brand-primary)",
            fillColor: "var(--color-brand-primary)",
            fillOpacity: 0.07,
            weight: 2,
          }}
        />
      ) : null}

      {point?.lat ? (
        <Marker position={[Number(point.lat), Number(point.lng)]} icon={pin} />
      ) : null}

      <ClickToPick onPick={onPick} />
      <Recenter point={point} region={region} />
    </MapContainer>
  );
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(event) {
      onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/** Keeps the chosen point (or a newly picked region) in view. */
function Recenter({ point, region }) {
  const map = useMap();
  const key = point?.lat ? `p:${point.lat},${point.lng}` : `r:${region?.id ?? ""}`;

  useEffect(() => {
    if (point?.lat) {
      map.setView([Number(point.lat), Number(point.lng)], Math.max(map.getZoom(), 14));
    } else if (region) {
      map.fitBounds(
        L.latLng(region.lat, region.lng).toBounds(region.radius * 2),
        { padding: [16, 16] },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}
