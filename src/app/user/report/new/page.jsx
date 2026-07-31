"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportForm } from "@/components/reports/ReportForm";
import { Card, CardBody } from "@/components/ui/Card";
import { createReport } from "@/actions/reports";
import { useCityCorporations } from "@/hooks/useReports";
import { notifyError, notifySuccess } from "@/lib/toast";

/**
 * One page covers both report types — `type` is a field inside ReportForm, not
 * a separate route (04-features-spec.md: "same form pattern").
 */
export default function NewReportPage() {
  const router = useRouter();
  const { cityCorporations, loading } = useCityCorporations();

  async function handleSubmit(values) {
    const result = await createReport(values);

    if (result.success) {
      notifySuccess("Report submitted. The authority can see it now.");
      router.push("/user/reports");
    } else {
      notifyError(result.error);
    }

    return result;
  }

  return (
    <>
      <PageHeader
        title="Report a hazard or hotspot"
        description="The more specific you are, the faster the right authority can act."
      />

      <div className="p-4 sm:p-6">
        <Card className="mx-auto max-w-2xl">
          <CardBody className="sm:px-6 sm:py-6">
            <ReportForm
              cityCorporations={cityCorporations}
              cityCorporationsLoading={loading}
              onSubmit={handleSubmit}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
