"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconList,
  IconMap,
  IconPlus,
  IconSend,
  IconSiren,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getRoleMeta, resolveHref } from "@/lib/role-meta";

/**
 * Panel navigation. The label set comes from the `role` prop via ROLE_META —
 * one component for all three panels, never a per-panel copy
 * (01-architecture.md, component reuse rule).
 */
const NAV_ICONS = {
  map: IconMap,
  plus: IconPlus,
  list: IconList,
  siren: IconSiren,
  send: IconSend,
};

export function PanelNav({ role, cityCorpId, unitId, onNavigate, className }) {
  const pathname = usePathname();
  const meta = getRoleMeta(role);

  return (
    <nav aria-label={`${meta.label} sections`} className={cn("p-3", className)}>
      <ul className="flex flex-col gap-1">
        {meta.nav.map((item) => {
          const href = resolveHref(item.href, cityCorpId, unitId);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = NAV_ICONS[item.icon] ?? IconList;

          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? cn("bg-surface-alt", meta.accentTextClass)
                    : "text-ink-muted hover:bg-surface-alt hover:text-ink",
                )}
              >
                {isActive ? (
                  <span
                    className={cn(
                      "absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full",
                      meta.accentClass,
                    )}
                    aria-hidden="true"
                  />
                ) : null}
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default PanelNav;
