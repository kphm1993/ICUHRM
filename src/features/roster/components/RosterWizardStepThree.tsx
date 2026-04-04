import type {
  DutyDesign,
  DutyDesignAssignment,
  ISODateString,
  RosterPeriod
} from "@/domain/models";
import { RosterWizardDutyDesignCalendar } from "@/features/roster/components/RosterWizardDutyDesignCalendar";
import { formatRosterDate } from "@/features/roster/lib/formatters";
import { listRosterWizardMonthsInRange } from "@/features/roster/lib/rosterWizardStepOne";
import { buildRosterWizardDutyDesignAssignmentsByDate } from "@/features/roster/lib/rosterWizardStepThree";

interface RosterWizardStepThreeProps {
  readonly effectiveRange: RosterPeriod;
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly selectedDutyDesignId: string;
  readonly assignmentMode: "standard" | "holiday-override";
  readonly selectedDates: ReadonlyArray<ISODateString>;
  readonly isDisabled: boolean;
  readonly isLoadingReferenceData: boolean;
  readonly onSelectedDutyDesignIdChange: (value: string) => void;
  readonly onAssignmentModeChange: (value: "standard" | "holiday-override") => void;
  readonly onToggleDateSelection: (date: ISODateString) => void;
  readonly onApplyAssignmentToSelectedDates: () => void;
  readonly onClearDateSelection: () => void;
  readonly onClearAssignment: (
    date: ISODateString,
    mode: "standard" | "holiday-override"
  ) => void;
}

export function RosterWizardStepThree(props: RosterWizardStepThreeProps) {
  const renderedMonths = listRosterWizardMonthsInRange(props.effectiveRange);
  const dutyDesignsById = new Map(
    props.dutyDesigns.map((dutyDesign) => [dutyDesign.id, dutyDesign] as const)
  );
  const activeDutyDesignOptions = props.dutyDesigns.filter(
    (dutyDesign) => dutyDesign.isActive
  );
  const assignmentsByDate = buildRosterWizardDutyDesignAssignmentsByDate({
    dutyDesignAssignments: props.dutyDesignAssignments
  });
  const assignmentDisplayByDate = Object.fromEntries(
    Object.entries(assignmentsByDate).map(([date, entry]) => {
      const standardDesign = entry.standardAssignment
        ? dutyDesignsById.get(entry.standardAssignment.dutyDesignId)
        : undefined;
      const holidayOverrideDesign = entry.holidayOverrideAssignment
        ? dutyDesignsById.get(entry.holidayOverrideAssignment.dutyDesignId)
        : undefined;

      return [
        date,
        {
          standardAssignment: entry.standardAssignment
            ? {
                code: standardDesign?.code ?? entry.standardAssignment.dutyDesignId,
                label: standardDesign?.label ?? entry.standardAssignment.dutyDesignId,
                isMissing: standardDesign === undefined,
                isInactive: standardDesign?.isActive === false
              }
            : undefined,
          holidayOverrideAssignment: entry.holidayOverrideAssignment
            ? {
                code:
                  holidayOverrideDesign?.code ??
                  entry.holidayOverrideAssignment.dutyDesignId,
                label:
                  holidayOverrideDesign?.label ??
                  entry.holidayOverrideAssignment.dutyDesignId,
                isMissing: holidayOverrideDesign === undefined,
                isInactive: holidayOverrideDesign?.isActive === false
              }
            : undefined
        }
      ] as const;
    })
  );

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Step 3
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
          Duty Design Mapping
        </h3>
        <p className="text-sm text-slate-600">
          Map standard duty designs and optional holiday overrides onto the Step 1
          calendar before manual shift allocation begins.
        </p>
      </header>

      {props.isLoadingReferenceData ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          Loading duty designs...
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-4">
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Assignment Controls
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Select dates, choose a duty design, then apply it as a standard mapping
                or a holiday override.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Duty design</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={
                  props.isDisabled ||
                  props.isLoadingReferenceData ||
                  activeDutyDesignOptions.length === 0
                }
                onChange={(event) =>
                  props.onSelectedDutyDesignIdChange(event.target.value)
                }
                value={props.selectedDutyDesignId}
              >
                <option value="">Select active duty design</option>
                {activeDutyDesignOptions.map((dutyDesign) => (
                  <option key={dutyDesign.id} value={dutyDesign.id}>
                    {dutyDesign.label} ({dutyDesign.code})
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">
                Assignment mode
              </legend>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  checked={props.assignmentMode === "standard"}
                  disabled={props.isDisabled || props.isLoadingReferenceData}
                  name="roster-wizard-duty-design-mode"
                  onChange={() => props.onAssignmentModeChange("standard")}
                  type="radio"
                />
                <span>
                  <span className="block font-medium text-slate-900">Standard</span>
                  <span className="mt-1 block text-slate-500">
                    Applies the design to the normal date mapping.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  checked={props.assignmentMode === "holiday-override"}
                  disabled={props.isDisabled || props.isLoadingReferenceData}
                  name="roster-wizard-duty-design-mode"
                  onChange={() => props.onAssignmentModeChange("holiday-override")}
                  type="radio"
                />
                <span>
                  <span className="block font-medium text-slate-900">
                    Holiday override
                  </span>
                  <span className="mt-1 block text-slate-500">
                    Only applies to Step 1 public holidays. Mixed batches are blocked.
                  </span>
                </span>
              </label>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
                disabled={
                  props.isDisabled ||
                  props.isLoadingReferenceData ||
                  !props.selectedDutyDesignId ||
                  props.selectedDates.length === 0
                }
                onClick={props.onApplyAssignmentToSelectedDates}
                type="button"
              >
                Apply To {props.selectedDates.length} Selected Date
                {props.selectedDates.length === 1 ? "" : "s"}
              </button>

              <button
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={props.isDisabled || props.selectedDates.length === 0}
                onClick={props.onClearDateSelection}
                type="button"
              >
                Clear Date Selection
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {props.selectedDates.length === 0 ? (
                "No dates selected."
              ) : (
                <>
                  Selected dates:{" "}
                  <span className="font-semibold text-slate-900">
                    {[...props.selectedDates].sort().map(formatRosterDate).join(", ")}
                  </span>
                </>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Mapping Summary
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Review and clear individual standard or holiday-override mappings before
                moving on.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Mapped Dates
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {Object.keys(assignmentsByDate).length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Standard Slots
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {
                    props.dutyDesignAssignments.filter(
                      (assignment) => !assignment.isHolidayOverride
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Holiday Overrides
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {
                    props.dutyDesignAssignments.filter(
                      (assignment) => assignment.isHolidayOverride
                    ).length
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {props.dutyDesignAssignments.length === 0 ? (
                <p className="text-sm text-slate-500">No duty design mappings saved yet.</p>
              ) : (
                props.dutyDesignAssignments.map((assignment) => {
                  const dutyDesign = dutyDesignsById.get(assignment.dutyDesignId);

                  return (
                    <article
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      key={assignment.id}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatRosterDate(assignment.date)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {assignment.isHolidayOverride
                            ? "Holiday override"
                            : "Standard"}{" "}
                          | {dutyDesign?.label ?? assignment.dutyDesignId}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-slate-700">
                            {dutyDesign?.code ?? "Missing"}
                          </span>
                          {dutyDesign === undefined ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-rose-900">
                              Missing Design
                            </span>
                          ) : null}
                          {dutyDesign?.isActive === false ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-amber-900">
                              Inactive Design
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={props.isDisabled}
                        onClick={() =>
                          props.onClearAssignment(
                            assignment.date,
                            assignment.isHolidayOverride
                              ? "holiday-override"
                              : "standard"
                          )
                        }
                        type="button"
                      >
                        Clear
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          {renderedMonths.map((month) => (
            <RosterWizardDutyDesignCalendar
              assignedByDate={assignmentDisplayByDate}
              isDisabled={props.isDisabled || props.isLoadingReferenceData}
              key={month}
              month={month}
              onToggleDateSelection={props.onToggleDateSelection}
              publicHolidayDates={props.publicHolidayDates}
              range={props.effectiveRange}
              selectedDates={props.selectedDates}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
