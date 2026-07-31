import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cityCorporations } from "@/db/schema";
import { PanelShell } from "@/components/layout/PanelShell";
import { requireRole } from "@/lib/session";

/**
 * City Corporation panel shell — same shell as the other two, different accent
 * and nav set, both driven by the `role` prop.
 */
export default async function CityCorpLayout({ children, params }) {
  const { cityCorpId } = await params;
  await requireRole(["city_corp"], { cityCorpId });

  const [cityCorp] = await db
    .select({ id: cityCorporations.id, name: cityCorporations.name })
    .from(cityCorporations)
    .where(eq(cityCorporations.id, cityCorpId))
    .limit(1);

  if (!cityCorp) notFound();

  return (
    <PanelShell
      role="city_corp"
      cityCorpId={cityCorpId}
      orgName={cityCorp.name}
      userName="Authority"
    >
      {children}
    </PanelShell>
  );
}
