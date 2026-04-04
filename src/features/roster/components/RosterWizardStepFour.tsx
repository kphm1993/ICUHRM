import { useMemo, useRef } from "react";
import type { DoctorGroup, ISODateString } from "@/domain/models";
import { formatRosterDate } from "@/features/roster/lib/formatters";
import { getRosterWizardStepFourSourceLabel } from "@/features/roster/lib/rosterWizardStepFour";
import { RosterWizardShiftAllocationModal } from "@/features/roster/components/RosterWizardShiftAllocationModal";
import { RosterWizardShiftAllocationOverview } from "@/features/roster/components/RosterWizardShiftAllocationOverview";
import type {
  RosterWizardStepFourPreview,
  RosterWizardStepFourShiftDetails
} from "@/features/roster/services/rosterWizardService";

interface RosterWizardStepFourProps {
  readonly preview: RosterWizardStepFourPreview | null;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly selectedShiftId: string | null;
  readonly selectedShiftDetails: RosterWizardStepFourShiftDetails | null;
  readonly isDisabled: boolean;
  readonly isLoadingPreview: boolean;
  readonly isLoadingShiftDetails: boolean;
  readonly onOpenShift: (shiftId: string) => void;
  readonly onCloseShift: () => void;
  readonly onAssignDoctor: (doctorId: string | null) => void | Promise<unknown>;
}

export function RosterWizardStepFour(props: RosterWizardStepFourProps) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const doctorGroupsById = useMemo(
    () => new Map(props.doctorGroups.map((group) => [group.id, group] as const)),
    [props.doctorGroups]
  );

  function jumpToDate(date: ISODateString) {
    sectionRefs.current[date]?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
            Step 4
          </p>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
            Manual Shift Allocation
          </h3>
          <p className="text-sm text-slate-600">
            Review generated shift slots, inspect live bias-aware suggestions, and
            assign doctors one slot at a time without leaving the wizard.
          </p>
        </header>

        {props.isLoadingPreview ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
            Loading generated shift slots and current bias preview...
          </div>
        ) : null}

        {!props.isLoadingPreview && !props.preview ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
            No Step 4 preview is available yet.
          </div>
        ) : null}

        {props.preview ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Total Slots
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {props.preview.totalSlotCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Assigned
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">
                  {props.preview.assignedSlotCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Open
                </p>
                <p className="mt-2 text-2xl font-semibold text-amber-900">
                  {props.preview.unassignedSlotCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Invalid
                </p>
                <p className="mt-2 text-2xl font-semibold text-rose-900">
                  {props.preview.invalidSlotCount}
                </p>
              </div>
            </div>

            {props.preview.warnings.length > 0 ? (
              <div className="space-y-2 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <h4 className="font-semibold">Generation warnings</h4>
                {props.preview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[23rem_1fr]">
              <RosterWizardShiftAllocationOverview
                days={props.preview.days}
                doctorGroups={props.doctorGroups}
                onJumpToDate={jumpToDate}
              />

              <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    Daily Allocation List
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Click any shift row to inspect the bias tabs and assign a doctor.
                  </p>
                </div>

                <div className="space-y-4">
                  {props.preview.days.map((day) => (
                    <section
                      className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4"
                      key={day.date}
                      ref={(node) => {
                        sectionRefs.current[day.date] = node;
                      }}
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h5 className="text-base font-semibold text-slate-900">
                            {formatRosterDate(day.date)}
                          </h5>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            {day.isHoliday ? (
                              <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-900">
                                Holiday
                              </span>
                            ) : null}
                            {day.allowedDoctorGroupId ? (
                              <span className="rounded-full bg-brand-100 px-2 py-1 font-semibold text-brand-900">
                                {doctorGroupsById.get(day.allowedDoctorGroupId)?.name ??
                                  day.allowedDoctorGroupId}
                              </span>
                            ) : null}
                            {day.excludedDoctorCount > 0 ? (
                              <span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-800">
                                {day.excludedDoctorCount} excluded
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <p className="text-sm font-medium text-slate-600">
                          {day.assignedSlotCount}/{day.totalSlotCount} assigned
                        </p>
                      </header>

                      <div className="space-y-3">
                        {day.shifts.map((shift) => (
                          <button
                            className={[
                              "w-full rounded-2xl border px-4 py-3 text-left transition",
                              shift.assignmentStatus === "INVALID"
                                ? "border-rose-200 bg-rose-50 hover:border-rose-300"
                                : shift.assignmentStatus === "ASSIGNED"
                                  ? "border-emerald-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
                                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
                            ].join(" ")}
                            disabled={props.isDisabled}
                            key={shift.shiftId}
                            onClick={() => props.onOpenShift(shift.shiftId)}
                            type="button"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {shift.shiftTypeLabel}
                                  </span>
                                  {shift.slotLabel ? (
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                                      {shift.slotLabel}
                                    </span>
                                  ) : null}
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                                    {getRosterWizardStepFourSourceLabel(shift.source)}
                                  </span>
                                  {shift.assignmentStatus === "INVALID" ? (
                                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-900">
                                      Invalid
                                    </span>
                                  ) : null}
                                  {shift.assignmentStatus === "ASSIGNED" &&
                                  shift.assignedDoctorId &&
                                  shift.overallRecommendedDoctorId &&
                                  shift.assignedDoctorId !==
                                    shift.overallRecommendedDoctorId ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                                      Manual override
                                    </span>
                                  ) : null}
                                </div>

                                <p className="text-sm text-slate-600">
                                  {shift.locationLabel}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {shift.assignedDoctorName ?? "Unassigned"}
                                </p>
                                {shift.invalidReasons.length > 0 ? (
                                  <p className="text-sm text-rose-800">
                                    {shift.invalidReasons.join(" ")}
                                  </p>
                                ) : null}
                              </div>

                              <div className="text-sm font-semibold text-brand-800">
                                Assign
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </section>

      <RosterWizardShiftAllocationModal
        details={props.selectedShiftDetails}
        isOpen={props.selectedShiftId !== null}
        isBusy={props.isLoadingShiftDetails}
        onAssignDoctor={props.onAssignDoctor}
        onClose={props.onCloseShift}
      />
    </>
  );
}
