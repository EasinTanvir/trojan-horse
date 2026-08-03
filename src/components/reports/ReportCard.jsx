"use client";

import Image from "next/image";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconCheckCircle, IconMapPin } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatCoords, formatRelative, getTypeMeta } from "@/lib/report-meta";
import { StatusBadge } from "./StatusBadge";
import { StatusUpdateForm } from "./StatusUpdateForm";
import { DispatchControl } from "./DispatchControl";

/**
 * One report, rendered for every panel. Which controls appear is driven by
 * `role` — there is no management-specific or city-corp-specific copy of this
 * component anywhere (01-architecture.md, component reuse rule).
 *
 *   user        -> confirm/upvote control, no status controls
 *   management  -> resolve action only (see StatusUpdateForm)
 *   city_corp   -> full status control + remark
 *
 * The heading is the report type rather than a place name: there is no `area`
 * column in 02-database-schema.md, so coordinates are the location of record.
 */
export function ReportCard({
  report,
  role = "user",
  compact = false,
  onVote,
  onStatusChange,
  units,
  onDispatch,
  onWorkDone,
  workPending = false,
  votePending = false,
  className,
}) {
  const typeMeta = getTypeMeta(report.type);
  const TypeIcon = typeMeta.icon;
  const isUnit = role === "response_unit";
  const isAuthority =
    role === "management" || role === "city_corp" || isUnit;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn(compact && "py-3")}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0 text-ink-muted" title={typeMeta.label}>
            <TypeIcon className="size-5" />
          </span>

          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-display text-base font-semibold text-ink">
              {typeMeta.label}
            </h3>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <span>{report.cityCorporationName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={report.createdAt}>
                {formatRelative(report.createdAt)}
              </time>
            </p>
          </div>
        </div>

        <StatusBadge status={report.status} />
      </CardHeader>

      <CardBody className={cn("flex flex-col gap-3", compact && "py-3")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {report.photoUrl ? (
            <a
              href={report.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block shrink-0 overflow-hidden rounded-md border border-border-subtle"
              aria-label="Open the full-size photo of this report"
            >
              <Image
                src={report.photoUrl}
                alt=""
                width={128}
                height={96}
                unoptimized
                className="h-24 w-32 object-cover"
              />
            </a>
          ) : null}

          <p
            className={cn(
              "min-w-0 flex-1 text-sm text-ink",
              compact ? "line-clamp-3" : "leading-relaxed",
            )}
          >
            {report.description}
          </p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Coordinates</dt>
            <IconMapPin className="size-3.5" />
            <dd className="font-mono">
              {formatCoords(report.lat, report.lng)}
            </dd>
          </div>

          <div className="flex items-center gap-1.5">
            <dt>Confirmations</dt>
            <dd className="font-mono text-ink">{report.votes ?? 0}</dd>
          </div>

          {isAuthority && report.reporter ? (
            <div className="flex items-center gap-1.5">
              <dt>Reported by</dt>
              <dd className="text-ink">{report.reporter.name}</dd>
            </div>
          ) : null}
        </dl>

        {report.statusComment ? (
          <div className="rounded-md border-l-2 border-brand-primary bg-brand-primary-soft/50 px-3 py-2">
            <p className="text-xs font-semibold text-brand-primary">
              City Corporation remark
            </p>
            <p className="mt-0.5 text-sm text-ink">{report.statusComment}</p>
          </div>
        ) : null}
      </CardBody>

      {role === "user" ? (
        <CardFooter>
          <Button
            variant="secondary"
            size="sm"
            loading={votePending}
            onClick={() => onVote?.(report.id)}
          >
            <IconCheckCircle className="size-4" />
            Confirm this
          </Button>
          <p className="text-xs text-ink-muted">
            Confirming tells the authority more people are seeing this.
          </p>
        </CardFooter>
      ) : null}

      {isAuthority ? (
        <CardFooter className="block">
          <div className="flex flex-col gap-3">
            {/* Who has it, then what state it's in — routing above outcome. */}
            <DispatchControl
              role={role}
              report={report}
              units={units}
              onDispatch={onDispatch}
              onWorkDone={onWorkDone}
              workPending={workPending}
            />
            {/* A unit gets no status control at all — StatusUpdateForm returns
                null for its role, so skip the divider too. */}
            {isUnit ? null : (
              <div className="border-t border-border-subtle pt-3">
                <StatusUpdateForm
                  role={role}
                  report={report}
                  onSubmit={onStatusChange}
                />
              </div>
            )}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export default ReportCard;
