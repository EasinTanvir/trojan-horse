"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconMapPin, IconSpinner } from "@/components/ui/icons";
import { api } from "@/lib/axios";
import { cn } from "@/lib/cn";
import { formatCoords } from "@/lib/report-meta";
import { notifyError } from "@/lib/toast";

/**
 * Location for a report: the device's GPS fix by default, or any place the
 * reporter searches for.
 *
 * The GPS fix is captured automatically on mount, since the common case is
 * standing in front of the problem. Search exists for the other case —
 * reporting something seen earlier, or somewhere you can't safely stop.
 *
 * Search is Nominatim via /api/geocode; debounced because their usage policy
 * asks for at most one request a second.
 */
export function LocationPicker({ lat, lng, label, error, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const autoTried = useRef(false);

  const hasFix = Boolean(lat) && Boolean(lng);

  const captureCurrent = (auto = false) => {
    if (!navigator.geolocation) {
      if (!auto) notifyError("This browser can't share your location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          label: "Your current location",
        });
      },
      (geoError) => {
        setLocating(false);
        /* On the automatic attempt stay quiet — search is still available. */
        if (auto) return;
        notifyError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location access was blocked. Search for the place instead."
            : "Couldn't get your location. Search for the place instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  /* Pre-select the current location on first render. */
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    captureCurrent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Debounced place search. The short-query case clears results inside the
     timeout rather than synchronously, which React Compiler rejects in an
     effect body. */
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
    onChange({
      lat: result.lat.toFixed(6),
      lng: result.lng.toFixed(6),
      label: result.label,
    });
    setQuery("");
    setResults([]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">
        Location
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      </span>

      <div
        className={cn(
          "flex flex-col gap-3 rounded-md border bg-surface p-3",
          error ? "border-danger" : "border-border-subtle",
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
            hint="Search anywhere in Bangladesh if you aren't standing at the spot."
          />

          {searching ? (
            <IconSpinner className="absolute top-9 right-3 size-4 text-ink-muted" />
          ) : null}

          {results.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border-subtle bg-surface shadow-elevated">
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
      </div>

      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}

export default LocationPicker;
