import { cn } from "@/lib/cn";

/**
 * Generic pill. `StatusBadge` in /components/reports wraps this to lock the
 * status → tone + icon pairing; use that one for report statuses so the
 * mapping can never drift per screen (05-ui-guidelines.md checklist).
 *
 * Tone colors are the locked palette tokens. Never pass an arbitrary color.
 */
const TONES = {
  soft: {
    neutral: "bg-surface-alt text-ink-muted border-border-subtle",
    brand: "bg-brand-primary-soft text-brand-primary border-brand-primary/20",
    /* label text uses the darker amber for a 4.5:1 ratio — see globals.css */
    "under-review":
      "bg-status-under-review-soft text-status-under-review-ink border-status-under-review/25",
    resolved:
      "bg-status-resolved-soft text-status-resolved border-status-resolved/20",
    verified:
      "bg-status-verified-soft text-status-verified border-status-verified/20",
    danger: "bg-danger-soft text-danger border-danger/20",
  },
  solid: {
    neutral: "bg-ink-muted text-white border-transparent",
    brand: "bg-brand-primary text-white border-transparent",
    "under-review": "bg-status-under-review text-white border-transparent",
    resolved: "bg-status-resolved text-white border-transparent",
    verified: "bg-status-verified text-white border-transparent",
    danger: "bg-danger text-white border-transparent",
  },
};

const SIZES = {
  sm: "h-5 gap-1 px-1.5 text-xs",
  md: "h-6 gap-1.5 px-2 text-xs",
};

const ICON_SIZES = {
  sm: "size-3",
  md: "size-3.5",
};

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  icon: Icon,
  className,
  children,
  ...props
}) {
  const palette = TONES[variant] ?? TONES.soft;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border font-medium whitespace-nowrap",
        palette[tone] ?? palette.neutral,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className={ICON_SIZES[size] ?? ICON_SIZES.md} /> : null}
      {children}
    </span>
  );
}

export default Badge;
