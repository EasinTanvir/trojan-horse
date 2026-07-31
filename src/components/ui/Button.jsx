import { cn } from "@/lib/cn";
import { IconSpinner } from "./icons";

/**
 * Flat color fields only — no gradients anywhere (05-ui-guidelines.md).
 * Focus rings come from the global :focus-visible rule in globals.css; the
 * danger variant adds .focus-ring-danger so the ring stays legible on red.
 */
const VARIANTS = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary-dark",
  secondary:
    "bg-surface text-ink border border-border-subtle hover:bg-surface-alt",
  danger: "bg-danger text-white hover:bg-danger-dark focus-ring-danger",
  ghost: "text-ink-muted hover:bg-surface-alt hover:text-ink",
};

const SIZES = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-base",
};

/**
 * Shared class string, exported so anything that must render as an <a> or a
 * next/link (nav actions, "back to map" links) reuses these exact styles
 * instead of hand-rolling a look-alike button.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    fullWidth && "w-full",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <IconSpinner className="size-4" /> : null}
      {children}
    </button>
  );
}

export default Button;
