import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cityCorporations, responseUnits } from "@/db/schema";
import { PanelShell } from "@/components/layout/PanelShell";
import { requireRole } from "@/lib/session";

/**
 * Response unit panel shell.
 *
 * requireRole checks the role AND that the session's own responseUnitId matches
 * the [unitId] segment — a Gulshan Thana login cannot reach Banani Thana's jobs
 * by editing the URL, the same rule the two City Corporation panels follow.
 */
export default async function UnitLayout({ children, params }) {
  const { unitId } = await params;
  await requireRole(["response_unit"], { unitId });

  const [unit] = await db
    .select({
      id: responseUnits.id,
      name: responseUnits.name,
      corpName: cityCorporations.name,
    })
    .from(responseUnits)
    .innerJoin(
      cityCorporations,
      eq(responseUnits.cityCorporationId, cityCorporations.id),
    )
    .where(eq(responseUnits.id, unitId))
    .limit(1);

  if (!unit) notFound();

  return (
    <PanelShell
      role="response_unit"
      unitId={unitId}
      orgName={unit.corpName}
      userName={unit.name}
    >
      {children}
    </PanelShell>
  );
}
