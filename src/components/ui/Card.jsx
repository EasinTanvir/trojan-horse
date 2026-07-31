import { cn } from "@/lib/cn";

/**
 * Surface container. rounded-lg (8px) per 05-ui-guidelines.md — not squared
 * off, not oversized.
 *
 * `interactive` adds a hover treatment. Only set it when the card is genuinely
 * clickable; the guidelines explicitly call out hover-lift-on-everything as a
 * hover effect that communicates nothing.
 */
export function Card({
  as: Tag = "div",
  interactive = false,
  className,
  children,
  ...props
}) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-border-subtle bg-surface shadow-card",
        interactive &&
          "transition-colors duration-150 hover:border-brand-primary/40 hover:bg-brand-primary-soft/30",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ as: Tag = "h3", className, children, ...props }) {
  return (
    <Tag
      className={cn("font-display text-base font-semibold text-ink", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-ink-muted", className)} {...props}>
      {children}
    </p>
  );
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn("px-4 py-4 sm:px-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border-subtle bg-surface-alt px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
