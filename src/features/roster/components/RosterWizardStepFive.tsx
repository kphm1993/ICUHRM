import { useMemo } from "react";
import type { DoctorGroup, RosterWizardDraftStatus, RosterWizardStep } from "@/domain/models";
import { formatRosterDate } from "@/features/roster/lib/formatters";
import {
  formatRosterWizardStepFourBiasValue,
  getRosterWizardStepFourSourceLabel
} from "@/features/roster/lib/rosterWizardStepFour";
import type { RosterWizardStepFiveReview } from "@/features/roster/services/rosterWizardService";

interface RosterWizardStepFiveProps {
  readonly review: RosterWizardStepFiveReview | null;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly status: RosterWizardDraftStatus;
  readonly activeAction:
    | "create"
    | "open"
    | "save"
    | "create-template"
    | "publish"
    | "lock"
    | "unlock"
    | "delete"
    | null;
  readonly isDisabled: boolean;
  readonly isLoadingReview: boolean;
  readonly onEditStep: (step: RosterWizardStep) => void | Promise<unknown>;
  readonly onPublish: () => void | Promise<unknown>;
}

function renderDutyDesignMapping(
  row: RosterWizardStepFiveReview["holidayCoverageRows"][number]
): string {
  if (
    row.standardDutyDesignLabel !== undefined &&
    row.holidayOverrideDutyDesignLabel !== undefined
  ) {
    return `${row.standardDutyDesignLabel} | ${row.holidayOverrideDutyDesignLabel}`;
  }

  if (row.holidayOverrideDutyDesignLabel !== undefined) {
    return row.holidayOverrideDutyDesignLabel;
  }

  if (row.standardDutyDesignLabel !== undefined) {
    return row.standardDutyDesignLabel;
  }

  return "Legacy fallback";
}

function getPublishedStateMessage(status: RosterWizardDraftStatus): string | null {
  switch (status) {
    case "PUBLISHED":
      return "This wizard draft was previously published and is currently unlocked for edits. Publish and lock it again when the changes are ready.";
    case "LOCKED":
      return "This wizard draft is locked. Unlock it to make further edits.";
    default:
      return null;
  }
}

export function RosterWizardStepFive(props: RosterWizardStepFiveProps) {
  const doctorGroupsById = useMemo(
    () => new Map(props.doctorGroups.map((group) => [group.id, group.name] as const)),
    [props.doctorGroups]
  );
  const publishedStateMessage = getPublishedStateMessage(props.status);
  const review = props.review;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Step 5
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
          Review &amp; Publish
        </h3>
        <p className="text-sm text-slate-600">
          Review workload, live bias, holiday coverage, and constrained dates before
          publishing the wizard draft.
        </p>
      </header>

      {props.isLoadingReview ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          Loading Step 5 review data...
        </div>
      ) : null}

      {!props.isLoadingReview && !props.review ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          No Step 5 review data is available yet.
        </div>
      ) : null}

      {review ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total Slots
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {review.summary.totalSlotCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Assigned
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {review.summary.assignedSlotCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Open
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">
                {review.summary.unassignedSlotCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Invalid
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">
                {review.summary.invalidAssignmentCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Holidays
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {review.summary.holidayCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Constraints
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {review.summary.constrainedDateCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {review.summary.exclusionPeriodCount} exclusions
              </p>
            </div>
          </div>

          {review.warnings.length > 0 ? (
            <div className="space-y-2 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <h4 className="font-semibold">Generation warnings</h4>
              {review.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {!review.publishReadiness.canPublish ? (
            <div className="space-y-2 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <h4 className="font-semibold">Publish blocked</h4>
              {review.publishReadiness.blockingReasons.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </div>
          ) : props.status === "DRAFT" ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              This draft is ready to publish.
            </div>
          ) : null}

          {publishedStateMessage ? (
            <div className="rounded-3xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950">
              {publishedStateMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((step) => (
                <button
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={props.isDisabled}
                  key={step}
                  onClick={() => void props.onEditStep(step as RosterWizardStep)}
                  type="button"
                >
                  Edit Step {step}
                </button>
              ))}
            </div>

            {props.status !== "LOCKED" ? (
              <button
                className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
                disabled={
                  props.isDisabled || !review.publishReadiness.canPublish
                }
                onClick={() => {
                  if (
                    window.confirm(
                      "Publish and lock this wizard draft? You can unlock it later for further edits."
                    )
                  ) {
                    void props.onPublish();
                  }
                }}
                type="button"
              >
                {props.activeAction === "publish"
                  ? "Publishing..."
                  : props.status === "PUBLISHED"
                    ? "Republish & Lock Draft"
                    : "Publish & Lock Draft"}
              </button>
            ) : null}
          </div>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Doctor Workload</h4>
              <p className="mt-1 text-sm text-slate-500">
                Assigned slot counts based on the current valid Step 4 allocation.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Doctor</th>
                    <th className="px-3 py-2 font-semibold">Group</th>
                    <th className="px-3 py-2 font-semibold">Total</th>
                    <th className="px-3 py-2 font-semibold">Day</th>
                    <th className="px-3 py-2 font-semibold">Night</th>
                    <th className="px-3 py-2 font-semibold">Holiday</th>
                    <th className="px-3 py-2 font-semibold">Constrained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {review.doctorWorkloadRows.map((row) => (
                    <tr key={row.doctorId}>
                      <td className="px-3 py-2 align-top">
                        <div className="font-semibold text-slate-900">{row.doctorName}</div>
                        <div className="text-xs text-slate-500">
                          {row.doctorUniqueIdentifier}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.doctorGroupId
                          ? doctorGroupsById.get(row.doctorGroupId) ?? row.doctorGroupId
                          : "Unassigned"}
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {row.totalAssignedSlotCount}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.daySlotCount}</td>
                      <td className="px-3 py-2 text-slate-700">{row.nightSlotCount}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.holidayAssignmentCount}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.constrainedDateAssignmentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Bias Summary</h4>
              <p className="mt-1 text-sm text-slate-500">
                Live criteria-based bias snapshot after the current manual allocation.
              </p>
            </div>

            {review.biasSummaryColumns.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No active bias criteria are available for this roster.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Doctor</th>
                      {review.biasSummaryColumns.map((column) => (
                        <th className="px-3 py-2 font-semibold" key={column.criteriaId}>
                          <div>{column.label}</div>
                          <div className="text-xs font-medium text-slate-500">
                            {column.code}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {review.biasSummaryRows.map((row) => (
                      <tr key={row.doctorId}>
                        <td className="px-3 py-2 align-top">
                          <div className="font-semibold text-slate-900">
                            {row.doctorName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.doctorUniqueIdentifier}
                          </div>
                        </td>
                        {review.biasSummaryColumns.map((column) => (
                          <td
                            className="px-3 py-2 text-slate-700"
                            key={`${row.doctorId}:${column.criteriaId}`}
                          >
                            {formatRosterWizardStepFourBiasValue(
                              row.valuesByCriteriaId[column.criteriaId] ?? 0
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Holiday Coverage</h4>
              <p className="mt-1 text-sm text-slate-500">
                Coverage and duty-design mapping state for each Step 1 holiday.
              </p>
            </div>

            {review.holidayCoverageRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No public holidays are marked in Step 1.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Assigned</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                      <th className="px-3 py-2 font-semibold">Mapping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {review.holidayCoverageRows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {formatRosterDate(row.date)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.assignedSlotCount}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.totalSlotCount}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {renderDutyDesignMapping(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Group Constraint Impact
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Constrained dates, allowed groups, and current coverage.
              </p>
            </div>

            {review.groupConstraintImpactRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No constrained dates are configured in Step 2.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Allowed Group</th>
                      <th className="px-3 py-2 font-semibold">Excluded Doctors</th>
                      <th className="px-3 py-2 font-semibold">Assigned</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {review.groupConstraintImpactRows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {formatRosterDate(row.date)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {doctorGroupsById.get(row.allowedDoctorGroupId) ??
                            row.allowedDoctorGroupId}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.excludedDoctorCount}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.assignedSlotCount}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.totalSlotCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Invalid Assignments
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Saved assignments that are no longer valid and will block publish.
              </p>
            </div>

            {review.invalidAssignmentRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No invalid saved assignments were detected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Shift</th>
                      <th className="px-3 py-2 font-semibold">Assigned Doctor</th>
                      <th className="px-3 py-2 font-semibold">Source</th>
                      <th className="px-3 py-2 font-semibold">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {review.invalidAssignmentRows.map((row) => (
                      <tr key={row.shiftId}>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {formatRosterDate(row.date)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div>{row.shiftTypeLabel}</div>
                          <div className="text-xs text-slate-500">
                            {row.slotLabel ? `${row.slotLabel} | ` : ""}
                            {row.locationLabel}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.assignedDoctorName ?? "Unknown doctor"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {getRosterWizardStepFourSourceLabel(row.source)}
                        </td>
                        <td className="px-3 py-2 text-rose-800">
                          {row.invalidReasons.join(" ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
