"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconMapPin, IconSiren } from "@/components/ui/icons";
import { api } from "@/lib/axios";
import { cn } from "@/lib/cn";
import { getPusherClient } from "@/lib/pusher-client";
import { SOS_EVENT, sosChannelName } from "@/lib/pusher-channels";
import { formatCoords, formatDateTime, formatRelative } from "@/lib/report-meta";
import { notifyError, notifyInfo } from "@/lib/toast";

/**
 * Live SOS feed, shared by the Management and City Corporation panels.
 *
 * 07-realtime-pusher.md scoped these to city_corp only; on request both
 * authority roles now receive them. The channel is unchanged —
 * `city-corp-{cityCorporationId}-alerts` — both panels simply subscribe to the
 * same one, so Dhaka North still never sees Dhaka South's alerts.
 *
 * History loads over Axios; Pusher only prepends what arrives afterwards.
 */
export function SosAlertFeed({ cityCorpId, className }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const seenIds = useRef(new Set());

  useEffect(() => {
    let active = true;

    api
      .get("/sos", { params: { cityCorpId } })
      .then((response) => {
        if (!active) return;
        const rows = response.data.data ?? [];
        rows.forEach((row) => seenIds.current.add(row.id));
        setAlerts(rows);
      })
      .catch((error) => {
        if (!active) return;
        notifyError(error.readableMessage ?? "Couldn't load SOS alerts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
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
          lat: payload.lat,
          lng: payload.lng,
          createdAt: payload.createdAt,
          user: { id: payload.userId, name: payload.userName },
        },
        ...current,
      ]);

      notifyInfo(`New SOS from ${payload.userName}.`);
    };

    channel.bind("pusher:subscription_succeeded", onSubscribed);
    channel.bind(SOS_EVENT, onAlert);

    return () => {
      channel.unbind(SOS_EVENT, onAlert);
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      pusher.unsubscribe(sosChannelName(cityCorpId));
      setLive(false);
    };
  }, [cityCorpId]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <span
          className={cn(
            "size-2 rounded-full",
            live ? "bg-brand-primary" : "bg-ink-muted/40",
          )}
          aria-hidden="true"
        />
        {live ? "Live — new alerts appear instantly" : "Connecting to live alerts…"}
      </p>

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
          {alerts.map((alert, index) => (
            <li key={alert.id}>
              <SosAlertRow alert={alert} latest={index === 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The newest alert is emphasised rather than the whole list being red: if
 * everything shouts, nothing reads as urgent.
 */
function SosAlertRow({ alert, latest = false }) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4",
        latest && "border-danger/40 bg-danger-soft/40",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          latest ? "bg-danger text-white" : "bg-surface-alt text-danger",
        )}
      >
        <IconSiren className="size-5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-display text-base font-semibold text-ink">
          {alert.user.name}
        </p>

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
      </div>

      <div className="flex shrink-0 flex-col sm:items-end">
        <time
          dateTime={alert.createdAt}
          className={cn(
            "text-sm font-medium",
            latest ? "text-danger" : "text-ink",
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
