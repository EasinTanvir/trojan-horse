"use client";

import { useRef, useState } from "react";
import { triggerSOS } from "@/actions/sos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconSiren } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/toast";

/**
 * SOS trigger: captures real GPS, then calls triggerSOS, which writes the
 * sos_alerts row and only then broadcasts on the City Corporation's Pusher
 * channel.
 *
 * Deliberately two-step — a single mis-tap on a phone shouldn't page an
 * emergency desk. The confirm dialog is the safeguard, not decoration.
 *
 * The jurisdiction is DERIVED server-side from the coordinates. It used to be a
 * dropdown here; asking someone in trouble to pick their City Corporation from
 * a list was the wrong design, and the browser shouldn't be the authority on it
 * anyway. triggerSOS decides, and the toast reports where it went.
 */
/* Matches the server's dedupe window; the server is the real guard, this just
   avoids opening a pointless dialog. */
const RESEND_COOLDOWN_MS = 60 * 1000;
export function SosButton({ className, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const lastSentAtRef = useRef(0);

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

  function openDialog() {
    if (Date.now() - lastSentAtRef.current < RESEND_COOLDOWN_MS) {
      notifyInfo("An SOS was already sent a moment ago — help is on the way.");
      return;
    }
    setOpen(true);
  }

  async function confirmSos() {
    setSending(true);
    try {
      const coords = await getPosition();
      const result = await triggerSOS({
        lat: coords.latitude,
        lng: coords.longitude,
      });

      if (result.success) {
        setOpen(false);
        lastSentAtRef.current = Date.now();

        if (result.data.duplicate) {
          notifyInfo("An SOS is already open for you — help is on the way.");
        } else {
          const thana = result.data.nearestThanaName;
          notifySuccess(
            `SOS sent to ${result.data.cityCorporationName}.` +
              (thana ? ` Nearest station: ${thana}.` : ""),
          );
        }
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
        onClick={openDialog}
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
        <p className="text-sm text-ink-muted">
          Only use this if you are in immediate danger. Your location decides
          which City Corporation and which police station is alerted. For a
          hazard that is not an emergency, submit a normal report instead.
        </p>
      </Modal>
    </>
  );
}

export default SosButton;
