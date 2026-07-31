import Link from "next/link";
import { LiveMapSection } from "@/components/map/LiveMapSection";
import { DangerZoneWatcher } from "@/components/safety/DangerZoneWatcher";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import {
  IconCheckCircle,
  IconClock,
  IconShieldCheck,
  IconSiren,
} from "@/components/ui/icons";
import { getSession, homePathForSession } from "@/lib/session";

/**
 * Landing page. Signed-in visitors get a link straight into their own panel;
 * everyone else sees sign in / register. Panel routes are no longer linked
 * directly — requireRole guards them, so the entry point is the login form.
 */
const STEPS = [
  {
    icon: IconClock,
    title: "You report it",
    body: "Photo, location and a description go to the City Corporation responsible for that area. It starts as under review.",
  },
  {
    icon: IconCheckCircle,
    title: "The authority acts",
    body: "Management works the queue and marks a report resolved once the problem has been dealt with.",
  },
  {
    icon: IconShieldCheck,
    title: "The City Corporation verifies",
    body: "A verified report has been confirmed on the ground. It is the platform's own seal, and only the City Corporation can give it.",
  },
];

export default async function HomePage() {
  const session = await getSession();
  const panelPath = session ? homePathForSession(session) : null;

  return (
    <div className="flex min-h-svh flex-col bg-surface-alt">
      {/* Warns visitors too, not just the citizen panel. Signed out, it shows
          the warning without the detail and offers a login. */}
      <DangerZoneWatcher isAuthenticated={Boolean(session)} />

      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <IconShieldCheck className="size-5 text-brand-primary" />
          <span className="font-display text-base font-semibold text-ink">
            Nirapod Path
          </span>

          <div className="ml-auto flex items-center gap-2">
            {panelPath ? (
              <Link href={panelPath} className={buttonClasses({ size: "sm" })}>
                Go to my panel
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonClasses({ variant: "ghost", size: "sm" })}
                >
                  Sign in
                </Link>
                <Link href="/register" className={buttonClasses({ size: "sm" })}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-display text-3xl font-semibold text-ink">
            Report a hazard. Track what happens to it.
          </h1>
          <p className="text-base text-ink-muted">
            Nirapod Path puts crime hotspots and broken infrastructure in Dhaka
            on one live map, routes each report to the City Corporation
            responsible for that area, and warns you before you walk into a
            place people have already reported.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link href={panelPath ?? "/register"} className={buttonClasses()}>
              {panelPath ? "Open my panel" : "Create an account"}
            </Link>
            {panelPath ? null : (
              <Link
                href="/login"
                className={buttonClasses({ variant: "secondary" })}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* The live map is the product — show it rather than describe it. Reads
            the public scope=all feed, so it works signed out. */}
        <section className="mt-10 flex flex-col gap-3" aria-labelledby="live-map-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="live-map-heading"
              className="font-display text-lg font-semibold text-ink"
            >
              What has been reported so far
            </h2>
            <Link
              href="/user/map"
              className="rounded-sm text-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
            >
              Open the full map
            </Link>
          </div>

          <LiveMapSection
            heightClass="h-[55svh] min-h-80 sm:min-h-96"
            isAuthenticated={Boolean(session)}
          />
        </section>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardBody className="flex flex-col gap-2">
                  <Icon className="size-5 text-brand-primary" />
                  <h2 className="font-display text-base font-semibold text-ink">
                    {step.title}
                  </h2>
                  <p className="text-sm text-ink-muted">{step.body}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <Card className="mt-10">
          <CardBody className="flex flex-col gap-2">
            <h2 className="font-display text-base font-semibold text-ink">
              Are you an authority?
            </h2>
            <p className="text-sm text-ink-muted">
              Management and City Corporation accounts are issued by the
              authority and cannot be created here. Sign in with the credentials
              you were given and you will land on your own panel.
            </p>
            <div>
              <Link
                href="/login"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Sign in
              </Link>
            </div>
          </CardBody>
        </Card>
      </main>

      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-4 text-xs text-ink-muted sm:px-6">
          <IconSiren className="size-4 text-danger" />
          Nirapod Path does not replace emergency services. In an emergency,
          call 999.
        </div>
      </footer>
    </div>
  );
}
