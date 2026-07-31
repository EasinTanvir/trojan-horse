"use client";

import { useState } from "react";
import { triggerSOS } from "@/actions/sos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { IconSiren } from "@/components/ui/icons";
import { useCityCorporations } from "@/hooks/useReports";
import { cn } from "@/lib/cn";
import { formatCoords } from "@/lib/report-meta";
import { notifyError, notifySuccess } from "@/lib/toast";

/**
 * SOS trigger: captures real GPS, then calls triggerSOS, which writes the
 * sos_alerts row and only then broadcasts on the City Corporation's Pusher
 * channel.
 *
 * Deliberately two-step — a single mis-tap on a phone shouldn't page an
 * emergency desk. The confirm dialog is the safeguard, not decoration.
 *
 * The jurisdiction is chosen here rather than derived from coordinates:
 * 02-database-schema.md left that decision to Phase 2, and we have no
 * jurisdiction polygons, so guessing could route an emergency to the wrong desk.
 */
export function SosButton({ className, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [cityCorporationId, setCityCorporationId] = useState("");
  const { cityCorporations, loading } = useCityCorporations();

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("This browser can't share your location."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) =>
          reject(
            new Error(
              error.code === error.PERMISSION_DENIED
                ? "Location access was blocked. Allow it in your browser settings to send an SOS."
                : "Couldn't get your location. Try again in a moment.",
            ),
          ),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  async function confirmSos() {
    if (!cityCorporationId) {
      notifyError("Choose which City Corporation should receive this.");
      return;
    }

    setSending(true);
    try {
      const coords = await getPosition();
      const result = await triggerSOS({
        cityCorporationId,
        lat: coords.latitude,
        lng: coords.longitude,
      });

      if (result.success) {
        setOpen(false);
        notifySuccess(
          `SOS sent from ${formatCoords(result.data.lat, result.data.lng)}.`,
        );
      } else {
        notifyError(result.error);
      }
    } catch (error) {
      notifyError(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "focus-ring-danger inline-flex items-center gap-1.5 rounded-md bg-danger font-display font-semibold tracking-wide text-white transition-colors hover:bg-danger-dark",
          size === "lg" ? "h-12 px-6 text-base" : "h-9 px-3 text-sm",
          className,
        )}
      >
        <IconSiren className={size === "lg" ? "size-5" : "size-4"} />
        SOS
      </button>

      <Modal
        open={open}
        onClose={() => (sending ? null : setOpen(false))}
        title="Send an SOS alert?"
        description="Your current location goes straight to the authority's emergency desk."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={sending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={sending} onClick={confirmSos}>
              <IconSiren className="size-4" />
              Send SOS
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Only use this if you are in immediate danger. For a hazard that is
            not an emergency, submit a normal report instead.
          </p>

          <Select
            label="Send to"
            required
            placeholder={loading ? "Loading…" : "Select a City Corporation"}
            disabled={loading || sending}
            value={cityCorporationId}
            onChange={(event) => setCityCorporationId(event.target.value)}
            options={cityCorporations.map((corp) => ({
              value: corp.id,
              label: corp.name,
            }))}
            hint="Whichever jurisdiction you're currently in."
          />
        </div>
      </Modal>
    </>
  );
}

export default SosButton;
