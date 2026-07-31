"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconMapPin } from "@/components/ui/icons";
import { notifyError } from "@/lib/toast";
import { PlaceSearchField } from "./PlaceSearchField";

/**
 * Source → destination picker for the safe-route feature.
 *
 * Source defaults to the device's GPS fix, since "route me home from here" is
 * the common case, but either end can be searched instead — you might be
 * planning a trip before setting off.
 */
export function SafeRouteDialog({ open, loading, onClose, onSubmit }) {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      notifyError("This browser can't share your location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setFrom({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Your current location",
        });
      },
      (error) => {
        setLocating(false);
        notifyError(
          error.code === error.PERMISSION_DENIED
            ? "Location access was blocked. Search for your starting point instead."
            : "Couldn't get your location. Search for your starting point instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  function submit() {
    if (!from || !to) {
      notifyError("Choose both a starting point and a destination.");
      return;
    }
    onSubmit({ from, to });
  }

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title="Find a safer route"
      description="We'll route around the crime hotspots people have reported, where a way around exists."
      size="lg"
      footer={
        <>
          <Button variant="secondary" disabled={loading} onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={submit}>
            Show route
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <PlaceSearchField
            label="From"
            placeholder="Search a starting point"
            value={from}
            hint="Where you're setting off from."
            onSelect={setFrom}
          />
          <div>
            <Button
              variant="secondary"
              size="sm"
              loading={locating}
              onClick={useMyLocation}
            >
              <IconMapPin className="size-4" />
              Use my current location
            </Button>
          </div>
        </div>

        <PlaceSearchField
          label="To"
          placeholder="Search a destination"
          value={to}
          hint="Where you're heading."
          onSelect={setTo}
        />

        <p className="rounded-md border border-border-subtle bg-surface-alt px-3 py-2 text-xs text-ink-muted">
          The suggested route is drawn in green when it clears every reported
          danger zone. If no clear way exists, it&rsquo;s drawn dashed in amber
          and says so — a compromised route is never shown as a safe one.
        </p>
      </div>
    </Modal>
  );
}

export default SafeRouteDialog;
