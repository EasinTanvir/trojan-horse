"use client";

import { useMemo, useState } from "react";
import {
  createResponseUnit,
  createUnitLogin,
  deleteResponseUnit,
} from "@/actions/units";
import { PlaceSearchField } from "@/components/map/PlaceSearchField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { IconMapPin, IconPlus, IconX } from "@/components/ui/icons";
import { useResponseUnits } from "@/hooks/useReports";
import { cn } from "@/lib/cn";
import { formatCoords } from "@/lib/report-meta";
import { UNIT_TYPE_OPTIONS, getUnitTypeMeta } from "@/lib/unit-meta";
import { notifyError, notifySuccess } from "@/lib/toast";

/**
 * The roster of units Management dispatches to — a Thana opens, a zone office
 * moves, so the list has to be editable rather than seed-only.
 *
 * Adding a unit makes it selectable in the dispatch dropdown and eligible as an
 * SOS "nearest station" immediately.
 *
 * Management can also issue a login per unit from here. The password is shown
 * exactly once — only its bcrypt hash is stored — so it works like a real
 * credential handover rather than something retrievable later.
 */
export function UnitRoster({ cityCorpId, canManage }) {
  const { units: initialUnits, loading } = useResponseUnits({ cityCorpId });
  const [added, setAdded] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [issuedFor, setIssuedFor] = useState(null);
  const [credentials, setCredentials] = useState(null);

  /* Local overlay so the list reacts immediately without a refetch. */
  const units = useMemo(
    () =>
      [...initialUnits, ...added]
        .filter((unit) => !removed.includes(unit.id))
        .sort(
          (a, b) =>
            a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
        ),
    [initialUnits, added, removed],
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const unit of units) {
      if (!map.has(unit.type)) map.set(unit.type, []);
      map.get(unit.type).push(unit);
    }
    return [...map.entries()];
  }, [units]);

  async function remove(unit) {
    setBusyId(unit.id);
    try {
      const result = await deleteResponseUnit({ unitId: unit.id });
      if (result.success) {
        setRemoved((current) => [...current, unit.id]);
        notifySuccess(`${result.data.name} removed from the roster.`);
      } else {
        notifyError(result.error);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function issueLogin(unit) {
    setIssuedFor(unit.id);
    try {
      const result = await createUnitLogin({ unitId: unit.id });
      if (result.success) {
        /* Shown once and never again — it exists nowhere in readable form. */
        setCredentials(result.data);
        notifySuccess(`Login created for ${result.data.unitName}.`);
      } else {
        notifyError(result.error);
      }
    } finally {
      setIssuedFor(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {loading ? "Loading units…" : `${units.length} units on the roster`}
        </p>

        {canManage ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <IconPlus className="size-4" />
            Add a unit
          </Button>
        ) : null}
      </div>

      {loading ? (
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <li
              key={key}
              className="h-14 animate-pulse rounded-lg border border-border-subtle bg-surface"
            />
          ))}
        </ul>
      ) : units.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <p className="font-display text-base font-semibold text-ink">
            No units on the roster
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Add the Thanas, fire stations and zone offices you dispatch to.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([type, list]) => {
            const meta = getUnitTypeMeta(type);
            const Icon = meta.icon;

            return (
              <section key={type} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Icon className="size-4 text-ink-muted" />
                  {meta.label}
                  <span className="font-mono text-xs font-normal text-ink-muted">
                    {list.length}
                  </span>
                </h2>

                <ul className="flex flex-col gap-2">
                  {list.map((unit) => (
                    <li key={unit.id}>
                      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">
                            {unit.name}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                            <IconMapPin className="size-3.5 shrink-0" />
                            <span className="font-mono">
                              {formatCoords(unit.lat, unit.lng)}
                            </span>
                            {unit.contactPhone ? (
                              <a
                                href={`tel:${unit.contactPhone}`}
                                className="rounded-sm font-medium text-brand-primary underline underline-offset-2"
                              >
                                {unit.contactPhone}
                              </a>
                            ) : (
                              <Badge tone="neutral" size="sm">
                                No number — calls fall back to 999
                              </Badge>
                            )}
                          </p>
                        </div>

                        {canManage ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={issuedFor === unit.id}
                              onClick={() => issueLogin(unit)}
                            >
                              Create login
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={busyId === unit.id}
                              onClick={() => remove(unit)}
                            >
                              <IconX className="size-4" />
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* The password is visible exactly once. Copy it before closing. */}
      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="Login created"
        description="Copy these now — the password is shown once and cannot be retrieved."
        size="md"
        footer={
          <Button onClick={() => setCredentials(null)}>
            I&rsquo;ve copied them
          </Button>
        }
      >
        {credentials ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Hand these to{" "}
              <span className="font-medium">{credentials.unitName}</span>. They
              sign in at the normal login page and will only see work dispatched
              to them.
            </p>
            <dl className="flex flex-col gap-2 rounded-md border border-border-subtle bg-surface-alt p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="font-mono text-sm text-ink">
                  {credentials.email}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="text-xs text-ink-muted">Password</dt>
                <dd className="font-mono text-sm text-ink">
                  {credentials.password}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-ink-muted">
              We store only a hash of this password, so nobody — including you —
              can read it back later. Lost it? Remove the unit&rsquo;s login and
              issue a new one.
            </p>
          </div>
        ) : null}
      </Modal>

      {canManage ? (
        <AddUnitModal
          open={open}
          onClose={() => setOpen(false)}
          onAdded={(unit) => setAdded((current) => [...current, unit])}
        />
      ) : null}
    </div>
  );
}

function AddUnitModal({ open, onClose, onAdded }) {
  const [type, setType] = useState("thana");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function reset() {
    setType("thana");
    setName("");
    setPhone("");
    setPlace(null);
    setErrors({});
  }

  async function submit() {
    if (!place) {
      setErrors({ place: "Search for the unit's location." });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const result = await createResponseUnit({
        type,
        name,
        lat: place.lat,
        lng: place.lng,
        contactPhone: phone,
      });

      if (result.success) {
        notifySuccess(`${result.data.name} added to the roster.`);
        onAdded({
          id: result.data.id,
          type,
          name: result.data.name,
          lat: place.lat,
          lng: place.lng,
          contactPhone: phone.trim() || null,
        });
        reset();
        onClose();
      } else {
        notifyError(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Add a response unit"
      description="It becomes dispatchable straight away, and eligible as an SOS nearest station."
      size="lg"
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Add unit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Kind of unit"
          required
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={UNIT_TYPE_OPTIONS}
        />

        <Input
          label="Name"
          required
          placeholder="e.g. Kafrul Thana"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          hint="Use the station or office's real name."
        />

        <div className={cn("flex flex-col gap-1.5")}>
          <PlaceSearchField
            label="Location"
            placeholder="Search for the station or office"
            value={place}
            hint="Must fall inside your City Corporation's area."
            onSelect={setPlace}
          />
          {errors.place ? (
            <p className="text-xs font-medium text-danger">{errors.place}</p>
          ) : null}
        </div>

        <Input
          label="Phone number (optional)"
          placeholder="Leave blank if you can't verify it"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          hint="Only add a number you have verified. Blank shows 999 instead, which is safer than a wrong one."
        />
      </div>
    </Modal>
  );
}

export default UnitRoster;
