"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { IconCheckCircle } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { STATUS_META, STATUS_OPTIONS, getStatusMeta } from "@/lib/report-meta";
import { statusUpdateSchema } from "@/lib/validation/statusSchema";

/**
 * Status control, driven entirely by the `role` prop (03-roles-permissions.md):
 *
 *   management  ->  one action, `under_review -> resolved`, and nothing else.
 *                   No remark field. Nothing rendered once already resolved.
 *   city_corp   ->  any status from any status, in any direction, plus the
 *                   remark field — the only role that may write one.
 *   user        ->  no controls at all.
 *
 * Hiding a control is presentation, not enforcement. updateReportStatus
 * re-checks both rules through /lib/permissions.js server-side.
 */

/* Selected segment fill per status — literal strings so Tailwind sees them. */
const SEGMENT_ACTIVE = {
  under_review: "bg-status-under-review text-white border-status-under-review",
  resolved: "bg-status-resolved text-white border-status-resolved",
  verified: "bg-status-verified text-white border-status-verified",
};

export function StatusUpdateForm({ role, report, onSubmit, className }) {
  if (role === "management") {
    return (
      <ManagementControl
        report={report}
        onSubmit={onSubmit}
        className={className}
      />
    );
  }

  if (role === "city_corp") {
    return (
      <CityCorpControl
        report={report}
        onSubmit={onSubmit}
        className={className}
      />
    );
  }

  return null;
}

/** Management: a single transition, available only from `under_review`. */
function ManagementControl({ report, onSubmit, className }) {
  const [pending, setPending] = useState(false);
  const canResolve = report.status === "under_review";

  if (!canResolve) {
    const meta = getStatusMeta(report.status);
    return (
      <p className={cn("text-xs text-ink-muted", className)}>
        Marked {meta.label.toLowerCase()} — no further action available to
        Management.
      </p>
    );
  }

  async function handleResolve() {
    /* Same schema the Server Action re-parses. */
    const parsed = statusUpdateSchema.safeParse({
      reportId: report.id,
      status: "resolved",
    });
    if (!parsed.success) return;

    setPending(true);
    try {
      await onSubmit?.(parsed.data);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button size="sm" loading={pending} onClick={handleResolve}>
        <IconCheckCircle className="size-4" />
        Mark resolved
      </Button>
      <p className="text-xs text-ink-muted">
        Management can only move a report to resolved.
      </p>
    </div>
  );
}

/** City Corporation: full status control in any direction + the remark field. */
function CityCorpControl({ report, onSubmit, className }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      reportId: report.id,
      status: report.status,
      statusComment: report.statusComment ?? "",
    },
  });

  /* useWatch, not watch() — the latter returns a function React Compiler
     refuses to memoize, which opts the whole component out of compilation. */
  const selected = useWatch({ control, name: "status" });

  async function submit(values) {
    const result = await onSubmit?.(values);
    /* Re-baseline the form so the Save button disables again after a save. */
    if (result?.success) reset(values);
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className={cn("flex flex-col gap-4", className)}
    >
      <input type="hidden" {...register("reportId")} />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink">Status</legend>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STATUS_OPTIONS.map((option) => {
            const meta = STATUS_META[option.value];
            const Icon = meta.icon;
            const isSelected = selected === option.value;

            return (
              <label
                key={option.value}
                className="cursor-pointer"
                title={meta.description}
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register("status")}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary",
                    isSelected
                      ? SEGMENT_ACTIVE[option.value]
                      : "border-border-subtle bg-surface text-ink-muted hover:bg-surface-alt hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5" />
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>

        {errors.status ? (
          <p className="text-xs font-medium text-danger">
            {errors.status.message}
          </p>
        ) : null}
      </fieldset>

      <Textarea
        label="Remark"
        rows={3}
        placeholder="Optional note explaining the decision — shown to the citizen who reported it."
        hint="Only the City Corporation can write this. It replaces any previous remark."
        error={errors.statusComment?.message}
        {...register("statusComment")}
      />

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="sm"
          loading={isSubmitting}
          disabled={!isDirty}
        >
          Save update
        </Button>
        {!isDirty ? (
          <p className="text-xs text-ink-muted">No changes yet.</p>
        ) : null}
      </div>
    </form>
  );
}

export default StatusUpdateForm;
