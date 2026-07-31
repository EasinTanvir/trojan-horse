"use client";

import { IconAlertTriangle, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Full-width warning shown when the citizen enters a danger zone.
 *
 * A banner rather than a toast: this must not auto-dismiss while the person is
 * still inside the zone. `role="alert"` so a screen reader interrupts — this is
 * the one place in the app where interrupting is the correct behaviour.
 *
 * Driven by DangerZoneWatcher's geolocation subscription.
 */
export function DangerZoneBanner({ zone, onDismiss, className }) {
  if (!zone) return null;

  return (
    <div
      role="alert"
      className={cn(
        "border-b border-danger/30 bg-danger-soft animate-toast-in",
        className,
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3 sm:px-6">
        <IconAlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-danger">
            You are entering a reported danger zone
          </p>
          <p className="text-sm text-ink">
            {zone.reportCount} unresolved{" "}
            {zone.reportCount === 1 ? "hotspot report" : "hotspot reports"}{" "}
            {zone.distance != null ? (
              <>
                about <span className="font-mono">{zone.distance}m</span> away
              </>
            ) : (
              <>
                within <span className="font-mono">{zone.radius}m</span>
              </>
            )}
            . Stay alert, keep your phone out of sight, and avoid the area after
            dark if you can.
          </p>
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss danger zone warning"
            className="focus-ring-danger -mr-1 shrink-0 rounded-md p-1 text-danger transition-colors hover:bg-danger/10"
          >
            <IconX className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default DangerZoneBanner;
