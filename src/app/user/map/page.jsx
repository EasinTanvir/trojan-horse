import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { LiveMapSection } from "@/components/map/LiveMapSection";
import { buttonClasses } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/icons";

/**
 * Citizen panel map. The map itself lives in LiveMapSection, shared with the
 * public home page — this page is just the panel chrome around it.
 */
export default function UserMapPage() {
  return (
    <>
      <PageHeader
        title="Live map"
        description="Reported hazards and crime hotspots across the city."
        actions={
          <Link href="/user/report/new" className={buttonClasses({ size: "sm" })}>
            <IconPlus className="size-4" />
            Report something
          </Link>
        }
      />

      <div className="p-4 sm:p-6">
        <LiveMapSection heightClass="h-[60svh] min-h-96 lg:h-[calc(100svh-19rem)]" />
      </div>
    </>
  );
}
