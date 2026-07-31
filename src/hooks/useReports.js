"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/axios";
import { notifyError } from "@/lib/toast";

/**
 * Client-side report reads through the shared Axios instance and
 * /api/reports — the read half of the hybrid strategy in 01-architecture.md.
 * Mutations never come through here.
 *
 * Filters go to the server as query params rather than being applied to an
 * already-fetched array, so pagination stays correct.
 *
 * `loading` is derived by comparing the current request key against the last
 * one that finished, rather than being flipped by the effect. That keeps the
 * effect free of synchronous setState (React Compiler rejects that pattern) and
 * has the nice side effect that a post-mutation refresh doesn't flash
 * skeletons over data that's already on screen.
 */
export function useReports({
  scope = "all",
  cityCorpId,
  status = "",
  type = "",
  pageSize = 50,
  enabled = true,
} = {}) {
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  /* Only toast a fetch failure once per failing state, not on every retry. */
  const lastErrorRef = useRef(null);

  const requestKey = `${scope}|${cityCorpId ?? ""}|${status}|${type}|${pageSize}`;
  const loading = enabled && loadedKey !== requestKey;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const params = { scope, pageSize };
        if (cityCorpId) params.cityCorpId = cityCorpId;
        if (status) params.status = status;
        if (type) params.type = type;

        const response = await api.get("/reports", { params });
        if (cancelled) return;

        setReports(response.data.data ?? []);
        setMeta(response.data.meta ?? null);
        setError(null);
        lastErrorRef.current = null;
      } catch (requestError) {
        if (cancelled) return;

        const message =
          requestError.readableMessage ??
          "Couldn't load reports. Please try again.";
        setError(message);

        if (lastErrorRef.current !== message) {
          lastErrorRef.current = message;
          notifyError(message);
        }
      } finally {
        if (!cancelled) setLoadedKey(requestKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    requestKey,
    reloadToken,
    scope,
    cityCorpId,
    status,
    type,
    pageSize,
  ]);

  /** Re-fetch without clearing what's on screen — used after a mutation. */
  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { reports, meta, loading, error, refresh };
}

/** City Corporation list for the report form select and the SOS dialog. */
export function useCityCorporations() {
  const [cityCorporations, setCityCorporations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/city-corporations")
      .then((response) => {
        if (cancelled) return;
        setCityCorporations(response.data.data ?? []);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyError(
          error.readableMessage ?? "Couldn't load the City Corporation list.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { cityCorporations, loading };
}
