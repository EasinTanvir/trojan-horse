import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PanelShell } from "@/components/layout/PanelShell";
import { DangerZoneWatcher } from "@/components/safety/DangerZoneWatcher";
import { SosButton } from "@/components/safety/SosButton";
import { EdgeStoreProvider } from "@/lib/edgestore-client";
import { requireRole } from "@/lib/session";

/**
 * Citizen panel shell.
 *
 * requireRole runs on the server on every request into this subtree — the
 * sidebar hiding a link is not access control (06-auth.md).
 *
 * The SOS button lives in the top bar so it's reachable from every page, and
 * DangerZoneWatcher runs its geolocation subscription panel-wide.
 */
export default async function UserLayout({ children }) {
  const session = await requireRole(["user"]);

  const [account] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return (
    <EdgeStoreProvider>
      <PanelShell
        role="user"
        userName={account?.name}
        headerActions={<SosButton />}
        banner={<DangerZoneWatcher />}
      >
        {children}
      </PanelShell>
    </EdgeStoreProvider>
  );
}
