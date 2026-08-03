"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { IconSend } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/report-meta";
import { getDispatchStatusMeta, getUnitTypeMeta } from "@/lib/unit-meta";
import { formatDistance, suggestUnit, unitsByDistance } from "@/lib/unit-routing";

/**
 * Which response unit is handling this report.
 *
 * A SIBLING of StatusUpdateForm, not part of it, and the distinction is worth
 * keeping: `status` is the citizen-facing outcome ("is it fixed?"), dispatch is
 * internal routing ("who has it?"). They move independently, and folding
 * dispatch into ManagementControl just because that component is already
 * role-aware would tangle two different lifecycles.
 *
 * Driven by the same `role` prop contract as every other shared component:
 *   management -> compact row + dispatch modal
 *   city_corp  -> read-only, because it supervises Management
 *   user       -> nothing (and the API doesn't send the fields anyway)
 *
 * Renders as a compact row plus a Modal rather than an inline form, so the
 * authority queues stay dense.
 */
export function DispatchControl({
  role,
  report,
  units = [],
  onDispatch,
  onWorkDone,
  workPending = false,
  className,
}) {
  const assigned = report.assignedUnit ?? null;

  /* The unit's own view: what it was asked to do, and the one thing it can
     change. Deliberately no status control — see canMarkWorkDone. */
  if (role === "response_unit") {
    const done = report.dispatchStatus === "work_done";
    const closed = report.dispatchStatus === "completed";

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {report.dispatchNote ? (
          <p className="text-xs text-ink-muted">
            Note from Management:{" "}
            <span className="text-ink">“{report.dispatchNote}”</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={getDispatchStatusMeta(report.dispatchStatus).tone}
            icon={getDispatchStatusMeta(report.dispatchStatus).icon}
          >
            {getDispatchStatusMeta(report.dispatchStatus).label}
          </Badge>

          {closed ? (
            <p className="text-xs text-ink-muted">
              Closed by Management — nothing more to do.
            </p>
          ) : (
            <Button
              variant={done ? "secondary" : "primary"}
              size="sm"
              loading={workPending}
              onClick={() =>
                onWorkDone?.({ reportId: report.id, done: !done })
              }
            >
              {done ? "Reopen — not finished" : "Mark work done"}
            </Button>
          )}

          {done && !closed ? (
            <p className="text-xs text-ink-muted">
              Waiting on Management to confirm and close it.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (role === "city_corp") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        {assigned ? (
          <>
            <p className="text-xs text-ink-muted">
              Dispatched to{" "}
              <span className="font-medium text-ink">{assigned.name}</span>
              {report.dispatchedAt
                ? ` · ${formatRelative(report.dispatchedAt)}`
                : null}
            </p>
            {report.dispatchNote ? (
              <p className="text-xs text-ink-muted italic">
                “{report.dispatchNote}”
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-ink-muted">
            Not dispatched to a unit yet.
          </p>
        )}
      </div>
    );
  }

  if (role !== "management") return null;

  return (
    <ManagementDispatch
      report={report}
      units={units}
      assigned={assigned}
      onDispatch={onDispatch}
      className={className}
    />
  );
}

function ManagementDispatch({ report, units, assigned, onDispatch, className }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(report.dispatchNote ?? "");
  const [unitId, setUnitId] = useState("");
  const [sending, setSending] = useState(false);

  const point = { lat: Number(report.lat), lng: Number(report.lng) };

  /* Suggestion + nearest-first ordering, computed over the list the queue
     already fetched — no request per row. */
  const suggestion = useMemo(
    () => suggestUnit({ report, units }),
    [report, units],
  );

  const ranked = useMemo(
    () => unitsByDistance(point, units),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, report.lat, report.lng],
  );

  const options = ranked.map(({ unit, distance }) => ({
    value: unit.id,
    label: `${unit.name} — ${getUnitTypeMeta(unit.type).shortLabel} · ${formatDistance(distance)}`,
  }));

  const dispatchMeta = getDispatchStatusMeta(report.dispatchStatus);

  function openModal() {
    /* Pre-select the suggestion, or whatever is already assigned. */
    setUnitId(assigned?.id ?? suggestion?.unit?.id ?? "");
    setNote(report.dispatchNote ?? "");
    setOpen(true);
  }

  async function submit() {
    if (!unitId) return;
    setSending(true);
    try {
      const result = await onDispatch?.({
        reportId: report.id,
        responseUnitId: unitId,
        dispatchNote: note.trim() || undefined,
      });
      if (result?.success) setOpen(false);
    } finally {
      setSending(false);
    }
  }

  const suggestedMeta = suggestion
    ? getUnitTypeMeta(suggestion.unitType)
    : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {assigned ? (
        <Badge tone={getUnitTypeMeta(assigned.type).tone} icon={IconSend}>
          {assigned.name}
        </Badge>
      ) : (
        <Badge tone="neutral">{dispatchMeta.label}</Badge>
      )}

      <Button variant="secondary" size="sm" onClick={openModal}>
        <IconSend className="size-4" />
        {assigned ? "Re-dispatch" : "Dispatch"}
      </Button>

      {!assigned && suggestion ? (
        <p className="text-xs text-ink-muted">
          Suggested: {suggestion.unit.name} ·{" "}
          {formatDistance(suggestion.distance)}
        </p>
      ) : null}

      <Modal
        open={open}
        onClose={sending ? () => {} : () => setOpen(false)}
        title="Dispatch to a response unit"
        description="The unit does the work. You stay responsible for the report's status."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={sending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={sending} disabled={!unitId} onClick={submit}>
              {assigned ? "Re-dispatch" : "Dispatch"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {suggestion ? (
            <div className="flex items-start gap-2.5 rounded-md border border-brand-primary/30 bg-brand-primary-soft px-3 py-2.5">
              {suggestedMeta ? (
                <suggestedMeta.icon className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  Suggested: {suggestion.unit.name} ·{" "}
                  {formatDistance(suggestion.distance)}
                </p>
                <p className="text-xs text-ink-muted">{suggestion.reason}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-border-subtle bg-surface-alt px-3 py-2 text-xs text-ink-muted">
              No response units are registered for this City Corporation yet.
            </p>
          )}

          <Select
            label="Send to"
            required
            placeholder="Choose a unit"
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            options={options}
            hint="Sorted nearest first. Change it if the suggestion is wrong."
          />

          <Textarea
            label="Note for the unit (optional)"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything the crew should know before they arrive."
          />
        </div>
      </Modal>
    </div>
  );
}

export default DispatchControl;
