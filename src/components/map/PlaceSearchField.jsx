"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { IconSpinner } from "@/components/ui/icons";
import { api } from "@/lib/axios";
import { formatCoords } from "@/lib/report-meta";
import { notifyError } from "@/lib/toast";

/**
 * Place lookup used by the safe-route dialog. Debounced and proxied through
 * /api/geocode for the same reasons the report form's picker is.
 */
export function PlaceSearchField({ label, placeholder, value, onSelect, hint }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
      } catch (error) {
        if (!cancelled) {
          notifyError(error.readableMessage ?? "Couldn't search for that place.");
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

  return (
    <div className="relative">
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        hint={
          value
            ? `${value.label} · ${formatCoords(value.lat, value.lng)}`
            : hint
        }
      />

      {searching ? (
        <IconSpinner className="absolute top-9 right-3 size-4 text-ink-muted" />
      ) : null}

      {results.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border-subtle bg-surface shadow-elevated">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result);
                  setQuery("");
                  setResults([]);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-alt"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default PlaceSearchField;
