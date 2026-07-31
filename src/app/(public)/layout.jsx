import Link from "next/link";
import { IconShieldCheck } from "@/components/ui/icons";

/** Minimal shell for the signed-out pages — no panel nav, no role accent. */
export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-svh flex-col bg-surface-alt">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-md">
            <IconShieldCheck className="size-5 text-brand-primary" />
            <span className="font-display text-base font-semibold text-ink">
              Nirapod Path
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-ink-muted sm:px-6">
          A civic reporting service for Dhaka. Emergencies still go to 999.
        </div>
      </footer>
    </div>
  );
}
