"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  IconAlertTriangle,
  IconMapPin,
  IconSpinner,
} from "@/components/ui/icons";
import { api } from "@/lib/axios";
import { cn } from "@/lib/cn";
import { isInsideRegion } from "@/lib/city-corp-regions";
import { formatCoords } from "@/lib/report-meta";
import { notifyError } from "@/lib/toast";

const PickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-surface-alt">
      <p className="text-sm text-ink-muted">Loading map…</p>
    </div>
  ),
});

/**
 * Location for a report: GPS fix, map click, or place search — all three
 * constrained to the selected City Corporation's service area, because a report
 * filed against an authority that doesn't cover the spot can't be acted on.
 *
 * The area is drawn on the map rather than only enforced on submit, so the
 * constraint is visible before someone picks rather than after.
 */
export function LocationPicker({ lat, lng, label, region, error, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [outsideWarning, setOutsideWarning] = useState("");
  const autoTried = useRef(false);

  const hasFix = Boolean(lat) && Boolean(lng);
  const regionName = region?.name ?? "the selected City Corporation";

  /** Single gate every input path goes through. */
  function accept(
    { lat: nextLat, lng: nextLng, label: nextLabel },
    { auto = false } = {},
  ) {
    const point = { lat: Number(nextLat), lng: Number(nextLng) };

    if (!isInsideRegion(point, region)) {
      const message = auto
        ? `Your current location is outside ${regionName}. Pick a point inside the highlighted area, or choose a different City Corporation.`
        : `That point is outside ${regionName}. Pick somewhere inside the highlighted area.`;
      setOutsideWarning(message);
      if (!auto) notifyError(message);
      return false;
    }

    setOutsideWarning("");
    onChange({
      lat: Number(nextLat).toFixed(6),
      lng: Number(nextLng).toFixed(6),
      label: nextLabel,
    });
    return true;
  }

  const captureCurrent = (auto = false) => {
    if (!navigator.geolocation) {
      if (!auto) notifyError("This browser can't share your location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        accept(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: "Your current location",
          },
          { auto },
        );
      },
      (geoError) => {
        setLocating(false);
        if (auto) return;
        notifyError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location access was blocked. Search or tap the map instead."
            : "Couldn't get your location. Search or tap the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  /* Pre-select the current location once a region is known. */
  useEffect(() => {
    if (autoTried.current || !region) return;
    autoTried.current = true;
    captureCurrent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  /* Debounced place search. */
  useEffect(() => {
    const term = query.trim();
    let cancelled = false;

    if (term.length < 3) {
      const clear = setTimeout(() => {
        if (!cancelled) setResults([]);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(clear);
      };
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get("/geocode", { params: { q: term } });
        if (!cancelled) setResults(response.data.data ?? []);
      } catch (requestError) {
        if (!cancelled) {
          notifyError(
            requestError.readableMessage ?? "Couldn't search for that place.",
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function choose(result) {
    if (accept({ lat: result.lat, lng: result.lng, label: result.label })) {
      setQuery("");
      setResults([]);
    }
  }

  const problem = error || outsideWarning;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">
        Location
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      </span>

      {!region ? (
        <p className="rounded-md border border-dashed border-border-subtle bg-surface px-3 py-3 text-sm text-ink-muted">
          Choose a City Corporation first — the map will show the area your
          report has to fall inside.
        </p>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-md border bg-surface p-3",
            problem ? "border-danger" : "border-border-subtle",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <IconMapPin
                className={cn(
                  "size-5 shrink-0",
                  hasFix ? "text-brand-primary" : "text-ink-muted",
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">
                  {locating
                    ? "Finding your location…"
                    : hasFix
                      ? (label ?? "Location selected")
                      : "No location selected yet"}
                </p>
                <p className="font-mono text-xs text-ink-muted">
                  {hasFix ? formatCoords(lat, lng) : "—"}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              loading={locating}
              onClick={() => captureCurrent(false)}
            >
              Use my location
            </Button>
          </div>

          <div className="relative">
            <Input
              label="Or search for a place"
              placeholder="e.g. Farmgate overbridge, Uttara Sector 4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />

            {searching ? (
              <IconSpinner className="absolute top-9 right-3 size-4 text-ink-muted" />
            ) : null}

            {results.length > 0 ? (
              <ul className="absolute z-[99999] mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border-subtle bg-surface shadow-elevated">
                {results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => choose(result)}
                      className="block w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-alt"
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="h-64 overflow-hidden rounded-md border border-border-subtle">
            <PickerMap
              point={hasFix ? { lat, lng } : null}
              region={region}
              onPick={(point) =>
                accept({ ...point, label: "Picked on the map" })
              }
            />
          </div>

          <p className="text-xs text-ink-muted">
            Tap anywhere inside the highlighted circle to drop the pin. The
            circle is {regionName}&rsquo;s approximate service area.
          </p>
        </div>
      )}

      {problem ? (
        <p className="flex items-start gap-1.5 text-xs font-medium text-danger">
          <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {problem}
        </p>
      ) : null}
    </div>
  );
}

export default LocationPicker;
