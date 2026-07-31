import { Badge } from "@/components/ui/Badge";
import { getStatusMeta } from "@/lib/report-meta";

/**
 * The app's signature element (05-ui-guidelines.md): a status pill carrying an
 * icon as well as a color, so status survives being skimmed, printed, or seen
 * by someone who can't separate the hues.
 *
 *   clock      -> under_review
 *   check      -> resolved
 *   shield     -> verified   (the City Corporation's seal — used nowhere else)
 *
 * Always render statuses through this component, never a bare <Badge>.
 */
export function StatusBadge({ status, size = "md", variant = "soft", className }) {
  const meta = getStatusMeta(status);

  return (
    <Badge
      tone={meta.tone}
      icon={meta.icon}
      size={size}
      variant={variant}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}

export default StatusBadge;
