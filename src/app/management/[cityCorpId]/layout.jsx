import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cityCorporations } from "@/db/schema";
import { PanelShell } from "@/components/layout/PanelShell";
import { requireRole } from "@/lib/session";

/**
 * Management panel shell.
 *
 * requireRole checks the role AND that the session's city_corporation_id
 * matches the [cityCorpId] segment, so a Dhaka North account can't reach Dhaka
 * South's data by editing the URL (03-roles-permissions.md).
 */
export default async function ManagementLayout({ children, params }) {
  const { cityCorpId } = await params;
  await requireRole(["management"], { cityCorpId });

  const [cityCorp] = await db
    .select({ id: cityCorporations.id, name: cityCorporations.name })
    .from(cityCorporations)
    .where(eq(cityCorporations.id, cityCorpId))
    .limit(1);

  if (!cityCorp) notFound();

  return (
    <PanelShell
      role="management"
      cityCorpId={cityCorpId}
      orgName={cityCorp.name}
      userName="Management"
    >
      {children}
    </PanelShell>
  );
}
