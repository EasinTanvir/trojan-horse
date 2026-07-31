import { cn } from "@/lib/cn";

/**
 * Label + hint + inline error scaffolding shared by Input, Textarea and Select
 * so all three announce errors to screen readers identically and nothing
 * re-invents the error styling per form.
 *
 * Zod messages are rendered verbatim here, so schemas must phrase them in plain
 * language ("Enter a valid email", not "Invalid input: email") — see
 * 05-ui-guidelines.md.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className,
  children,
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** ids to hand to the control's aria-describedby. */
export function describedBy({ id, hint, error }) {
  const ids = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null];
  return ids.filter(Boolean).join(" ") || undefined;
}

/** Base look shared by every form control, so they line up exactly. */
export function controlClasses({ error, className } = {}) {
  return cn(
    "w-full rounded-md border bg-surface px-3 text-sm text-ink",
    "placeholder:text-ink-muted",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted",
    error
      ? "border-danger focus-ring-danger"
      : "border-border-subtle hover:border-ink-muted/50",
    className,
  );
}

export default Field;
