"use client";

import { useState } from "react";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getRoleMeta } from "@/lib/role-meta";
import { PanelHeader } from "./PanelHeader";
import { PanelNav } from "./PanelNav";

/**
 * The shell all three panels share: accent top bar + fixed left sidebar +
 * content area (05-ui-guidelines.md, Layout). Below `lg` the sidebar becomes a
 * drawer so the panels stay usable on a phone in the field.
 *
 * Toasts come from react-hot-toast's Toaster, mounted once in the root layout.
 */
export function PanelShell({
  role,
  cityCorpId,
  orgName,
  userName,
  headerActions,
  banner,
  children,
}) {
  const [navOpen, setNavOpen] = useState(false);
  const meta = getRoleMeta(role);

  return (
    <>
      <div className="flex min-h-svh flex-col">
        <PanelHeader
          role={role}
          orgName={orgName}
          userName={userName}
          actions={headerActions}
          onMenuClick={() => setNavOpen(true)}
        />

        {banner}

        <div className="flex flex-1">
          <aside className="hidden w-56 shrink-0 border-r border-border-subtle bg-surface lg:block">
            <div className="sticky top-14">
              <PanelNav role={role} cityCorpId={cityCorpId} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>

        {/* Mobile drawer */}
        {navOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-ink/50"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-border-subtle bg-surface">
              <div
                className={cn(
                  "flex h-14 items-center justify-between px-3 text-white",
                  meta.accentClass,
                )}
              >
                <span className="font-display text-sm font-semibold">
                  {meta.label}
                </span>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <IconX className="size-5" />
                </button>
              </div>
              <PanelNav
                role={role}
                cityCorpId={cityCorpId}
                onNavigate={() => setNavOpen(false)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default PanelShell;
