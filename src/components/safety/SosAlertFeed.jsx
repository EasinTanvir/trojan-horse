"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateSosStatus } from "@/actions/sos";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  IconFlame,
  IconMapPin,
  IconPolice,
  IconSiren,
} from "@/components/ui/icons";
import { api } from "@/lib/axios";
import { cn } from "@/lib/cn";
import { canUpdateSosStatus } from "@/lib/permissions";
import { getPusherClient } from "@/lib/pusher-client";
import {
  SOS_EVENT,
  SOS_STATUS_EVENT,
  sosChannelName,
} from "@/lib/pusher-channels";
import {
  formatCoords,
  formatDateTime,
  formatRelative,
  getSosStatusMeta,
} from "@/lib/report-meta";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/toast";

/**
 * Live SOS feed, shared by the Management and City Corporation panels.
 *
 * 07-realtime-pusher.md scoped these to city_corp only; on request both
 * authority roles now receive them AND can move an alert between pending and
 * resolved. The channel is unchanged — `city-corp-{cityCorporationId}-alerts` —
 * so Dhaka North still never sees Dhaka South's alerts.
 *
 * History loads over Axios; Pusher only prepends what arrives afterwards.
 */
export function SosAlertFeed({ cityCorpId, role, unitType, className }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const seenIds = useRef(new Set());

  /* Units see alerts but don't move them — acknowledging is the control
     room's call, and canUpdateSosStatus already says management/city_corp. */
  const canUpdate = canUpdateSosStatus({ role });
  void unitType; /* access is decided server-side; kept for prop symmetry */

  useEffect(() => {
    let cancelled = false;

    api
      .get("/sos", { params: { cityCorpId } })
      .then((response) => {
        if (cancelled) return;
        const rows = response.data.data ?? [];
        rows.forEach((row) => seenIds.current.add(row.id));
        setAlerts(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyError(error.readableMessage ?? "Couldn't load SOS alerts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityCorpId]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !cityCorpId) return undefined;

    const channel = pusher.subscribe(sosChannelName(cityCorpId));

    const onSubscribed = () => setLive(true);
    const onAlert = (payload) => {
      if (seenIds.current.has(payload.sosId)) return;
      seenIds.current.add(payload.sosId);

      setAlerts((current) => [
        {
          id: payload.sosId,
          status: payload.status ?? "pending",
          lat: payload.lat,
          lng: payload.lng,
          createdAt: payload.createdAt,
          user: { id: payload.userId, name: payload.userName },
          nearestThana: payload.nearestThana ?? null,
          nearestFireUnit: payload.nearestFireUnit ?? null,
        },
        ...current,
      ]);

      notifyInfo(`New SOS from ${payload.userName}.`);
    };

    /* Keeps both authority panels in step. The acting client receives its own
       broadcast too, but the patch is idempotent, so no echo suppression. */
    const onStatusChange = (payload) => {
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === payload.sosId
            ? { ...alert, status: payload.status }
            : alert,
        ),
      );
    };

    channel.bind("pusher:subscription_succeeded", onSubscribed);
    channel.bind(SOS_EVENT, onAlert);
    channel.bind(SOS_STATUS_EVENT, onStatusChange);

    return () => {
      channel.unbind(SOS_EVENT, onAlert);
      channel.unbind(SOS_STATUS_EVENT, onStatusChange);
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      pusher.unsubscribe(sosChannelName(cityCorpId));
      setLive(false);
    };
  }, [cityCorpId]);

  const changeStatus = useCallback(async (sosId, status) => {
    setPendingId(sosId);
    try {
      const result = await updateSosStatus({ sosId, status });

      if (result.success) {
        setAlerts((current) =>
          current.map((alert) =>
            alert.id === sosId ? { ...alert, status: result.data.status } : alert,
          ),
        );
        notifySuccess(
          {
            resolved: "Alert marked resolved.",
            acknowledged: "Acknowledged — the other panel can see that.",
            pending: "Alert reopened as pending.",
          }[status] ?? "Alert updated.",
        );
      } else {
        notifyError(result.error);
      }
    } finally {
      setPendingId(null);
    }
  }, []);

  /* Three explicit counts. The previous `alerts.length - pendingCount`
     labelled "resolved" became silently wrong the moment a third state
     existed. */
  const counts = alerts.reduce(
    (tally, alert) => {
      tally[alert.status] = (tally[alert.status] ?? 0) + 1;
      return tally;
    },
    { pending: 0, acknowledged: 0, resolved: 0 },
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <span
            className={cn(
              "size-2 rounded-full",
              live ? "bg-brand-primary" : "bg-ink-muted/40",
            )}
            aria-hidden="true"
          />
          {live
            ? "Live — new alerts appear instantly"
            : "Connecting to live alerts…"}
        </p>

        {!loading && alerts.length > 0 ? (
          <p className="text-xs text-ink-muted" aria-live="polite">
            {counts.pending} pending · {counts.acknowledged} acknowledged ·{" "}
            {counts.resolved} resolved
          </p>
        ) : null}
      </div>

      {loading ? (
        <ul className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1].map((key) => (
            <li
              key={key}
              className="h-24 animate-pulse rounded-lg border border-border-subtle bg-surface"
            />
          ))}
        </ul>
      ) : alerts.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <IconSiren className="size-6 text-ink-muted" />
          <p className="font-display text-base font-semibold text-ink">
            No SOS alerts
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            Alerts triggered by citizens in your jurisdiction appear here the
            moment they are sent.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <SosAlertRow
                alert={alert}
                canUpdate={canUpdate}
                pending={pendingId === alert.id}
                onChangeStatus={changeStatus}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A pending alert is emphasised in danger red; a resolved one drops back to a
 * quiet surface. If everything shouts, nothing reads as urgent.
 */
function SosAlertRow({ alert, canUpdate, pending, onChangeStatus }) {
  const meta = getSosStatusMeta(alert.status);
  const isPending = alert.status === "pending";
  const isSettled = alert.status === "resolved";

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4",
        isPending && "border-danger/40 bg-danger-soft/40",
        isSettled && "opacity-90",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          isPending ? "bg-danger text-white" : "bg-surface-alt text-ink-muted",
        )}
      >
        <IconSiren className="size-5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base font-semibold text-ink">
            {alert.user.name}
          </p>
          <Badge tone={meta.tone} icon={meta.icon} title={meta.description}>
            {meta.label}
          </Badge>
        </div>

        <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <IconMapPin className="size-3.5 shrink-0" />
          <span className="font-mono">{formatCoords(alert.lat, alert.lng)}</span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${alert.lat}&mlon=${alert.lng}#map=17/${alert.lat}/${alert.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
          >
            Open in map
          </a>
        </p>

        {/* Who to call. Falls back to 999 when a unit has no verified number —
            better a real national line than an unverified one. */}
        {alert.nearestThana || alert.nearestFireUnit ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {alert.nearestThana ? (
              <span className="flex items-center gap-1">
                <IconPolice className="size-3.5 shrink-0" />
                {alert.nearestThana.name}
                <a
                  href={`tel:${alert.nearestThana.contactPhone ?? "999"}`}
                  className="rounded-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
                >
                  {alert.nearestThana.contactPhone ?? "999"}
                </a>
              </span>
            ) : null}
            {alert.nearestFireUnit ? (
              <span className="flex items-center gap-1">
                <IconFlame className="size-3.5 shrink-0" />
                {alert.nearestFireUnit.name}
                <a
                  href={`tel:${alert.nearestFireUnit.contactPhone ?? "999"}`}
                  className="rounded-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
                >
                  {alert.nearestFireUnit.contactPhone ?? "999"}
                </a>
              </span>
            ) : null}
          </p>
        ) : null}

        {canUpdate ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {alert.status === "pending" ? (
              <>
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() => onChangeStatus(alert.id, "acknowledged")}
                >
                  Acknowledge
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={pending}
                  onClick={() => onChangeStatus(alert.id, "resolved")}
                >
                  Mark resolved
                </Button>
              </>
            ) : alert.status === "acknowledged" ? (
              <>
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() => onChangeStatus(alert.id, "resolved")}
                >
                  Mark resolved
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={pending}
                  onClick={() => onChangeStatus(alert.id, "pending")}
                >
                  Back to pending
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => onChangeStatus(alert.id, "pending")}
              >
                Reopen as pending
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col sm:items-end">
        <time
          dateTime={alert.createdAt}
          className={cn(
            "text-sm font-medium",
            isPending ? "text-danger" : "text-ink",
          )}
        >
          {formatRelative(alert.createdAt)}
        </time>
        <span className="font-mono text-xs text-ink-muted">
          {formatDateTime(alert.createdAt)}
        </span>
      </div>
    </Card>
  );
}

export default SosAlertFeed;
