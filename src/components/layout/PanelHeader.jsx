"use client";

import Link from "next/link";
import { logout } from "@/actions/auth";
import { IconLogout, IconMenu, IconShieldCheck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getRoleMeta } from "@/lib/role-meta";

/**
 * Panel top bar. The accent color and role label come from the `role` prop —
 * this is the one piece of chrome 05-ui-guidelines.md allows to differ per
 * panel, so the three panels read as related but distinct.
 *
 * `actions` is a slot: the user panel drops the SOS button in here.
 */
export function PanelHeader({
  role,
  orgName,
  userName,
  actions,
  onMenuClick,
  className,
}) {
  const meta = getRoleMeta(role);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 text-white",
        meta.accentClass,
        className,
      )}
    >
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1 rounded-md p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <IconMenu className="size-5" />
        </button>

        {/* Always the public home page, for every role. */}
        <Link href="/" className="flex min-w-0 items-center gap-2 rounded-md">
          <IconShieldCheck className="size-5 shrink-0 text-white" />
          <span className="font-display text-base font-semibold whitespace-nowrap text-white">
            Nirapod Path
          </span>
        </Link>

        <span
          className="hidden rounded-sm bg-white/15 px-2 py-0.5 text-xs font-medium text-white sm:inline"
          title={`Signed in as ${meta.label}`}
        >
          {meta.label}
        </span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {orgName ? (
            <span className="hidden max-w-[16rem] truncate text-sm text-white/90 md:inline">
              {orgName}
            </span>
          ) : null}
          {userName ? (
            <span className="hidden text-sm text-white/90 md:inline">
              {userName}
            </span>
          ) : null}

          {actions}

          {/* Server Action clears the httpOnly cookie and redirects. */}
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-md p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <IconLogout className="size-5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default PanelHeader;
