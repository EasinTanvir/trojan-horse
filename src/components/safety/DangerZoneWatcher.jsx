"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReports } from "@/hooks/useReports";
import {
  buildDangerZones,
  findBreachedZone,
} from "@/lib/geolocation";
import { DangerZoneBanner } from "./DangerZoneBanner";

/**
 * Real danger-zone alerting. Replaces the Phase 1 demo-trigger button.
 *
 * Entirely client-side, exactly as 07-realtime-pusher.md specifies: the browser
 * already has the hotspot coordinates from /api/reports, so watchPosition()
 * output is compared against them locally with a Haversine distance check. No
 * server round trip, no Pusher channel.
 *
 * Fires once per zone entry — re-entering after leaving warns again, but
 * standing inside one doesn't re-warn on every position update.
 */
export function DangerZoneWatcher({ isAuthenticated = true }) {
  const [activeZone, setActiveZone] = useState(null);
  const [dismissedZoneId, setDismissedZoneId] = useState(null);

  /* Only unresolved crime hotspots become zones — see buildDangerZones. */
  const { reports } = useReports({ scope: "all", pageSize: 100 });
  const zones = useMemo(() => buildDangerZones(reports), [reports]);

  /* Refs so the geolocation callback always sees current values without
     re-subscribing the watcher every time a report loads. */
  const zonesRef = useRef(zones);
  const insideZoneIdRef = useRef(null);

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const breach = findBreachedZone(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          zonesRef.current,
        );

        if (!breach) {
          insideZoneIdRef.current = null;
          setActiveZone(null);
          setDismissedZoneId(null);
          return;
        }

        /* Already warned about this one and still inside it — stay quiet. */
        if (insideZoneIdRef.current === breach.zone.id) return;

        insideZoneIdRef.current = breach.zone.id;
        setActiveZone({ ...breach.zone, distance: breach.distance });
      },
      () => {
        /* Denied or unavailable: the app stays fully usable without it, so
           this fails silently rather than nagging on every page. */
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const visibleZone =
    activeZone && activeZone.id !== dismissedZoneId ? activeZone : null;

  /* Dismissal is component state only, never persisted — a reload puts the
     warning back, because the danger hasn't gone away just because it was
     closed once. */
  return (
    <DangerZoneBanner
      zone={visibleZone}
      isAuthenticated={isAuthenticated}
      onDismiss={() => setDismissedZoneId(activeZone?.id ?? null)}
    />
  );
}

export default DangerZoneWatcher;
