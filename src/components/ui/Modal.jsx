"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { IconX } from "./icons";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Escape to close, click-outside to close, focus moved in on
 * open and restored to the trigger on close, Tab cycles inside the dialog.
 *
 * The scrim is a flat ink wash — no backdrop blur (glassmorphism is on the
 * anti-pattern checklist in 05-ui-guidelines.md).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE);
      if (focusable?.length) focusable[0].focus();
      else dialogRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  /* No portal target during SSR. The server renders nothing here and the
     client mounts the dialog into <body>, so there's nothing to mismatch. */
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-ink/50 animate-overlay-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-xl border border-border-subtle bg-surface shadow-overlay animate-dialog-in",
          SIZES[size] ?? SIZES.md,
        )}
      >
        {title ? (
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
            <div className="flex flex-col gap-1">
              <h2
                id={titleId}
                className="font-display text-lg font-semibold text-ink"
              >
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <IconX className="size-5" />
            </button>
          </div>
        ) : null}

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-border-subtle bg-surface-alt px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Convenience footer for the common confirm/cancel pair. */
export function ModalActions({
  onCancel,
  onConfirm,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  loading = false,
}) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </>
  );
}

export default Modal;
