import type {
  AssignedGroupConstraint,
  Doctor,
  DoctorExclusionPeriod,
  DoctorGroup,
  EntityId,
  GroupConstraintTemplate,
  ISODateString,
  RosterPeriod
} from "@/domain/models";
import { RosterWizardConstraintCalendar } from "@/features/roster/components/RosterWizardConstraintCalendar";
import { formatRosterDate } from "@/features/roster/lib/formatters";
import { listRosterWizardMonthsInRange } from "@/features/roster/lib/rosterWizardStepOne";
import {
  buildExcludedDoctorsByDateLookup,
  countExcludedDoctorImpactDates
} from "@/features/roster/lib/rosterWizardStepTwo";

interface RosterWizardStepTwoProps {
  readonly effectiveRange: RosterPeriod;
  readonly templates: ReadonlyArray<GroupConstraintTemplate>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
  readonly selectedTemplateId: string;
  readonly selectedDates: ReadonlyArray<ISODateString>;
  readonly newTemplateForm: {
    readonly code: string;
    readonly label: string;
    readonly allowedDoctorGroupId: string;
  };
  readonly exclusionForm: {
    readonly doctorId: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly reason: string;
  };
  readonly isDisabled: boolean;
  readonly isLoadingReferenceData: boolean;
  readonly activeAction:
    | "create"
    | "open"
    | "save"
    | "publish"
    | "lock"
    | "unlock"
    | "delete"
    | "create-template"
    | null;
  readonly onSelectedTemplateIdChange: (value: string) => void;
  readonly onToggleDateSelection: (date: ISODateString) => void;
  readonly onApplyTemplateToSelectedDates: () => void;
  readonly onClearDateSelection: () => void;
  readonly onClearGroupConstraint: (date: ISODateString) => void;
  readonly onNewTemplateFormChange: (
    field: "code" | "label" | "allowedDoctorGroupId",
    value: string
  ) => void;
  readonly onCreateTemplate: () => void | Promise<unknown>;
  readonly onExclusionFormChange: (
    field: "doctorId" | "startDate" | "endDate" | "reason",
    value: string
  ) => void;
  readonly onAddExclusion: () => void;
  readonly onRemoveExclusion: (id: EntityId) => void;
}

export function RosterWizardStepTwo(props: RosterWizardStepTwoProps) {
  const renderedMonths = listRosterWizardMonthsInRange(props.effectiveRange);
  const templatesById = new Map(props.templates.map((template) => [template.id, template] as const));
  const doctorGroupsById = new Map(
    props.doctorGroups.map((group) => [group.id, group] as const)
  );
  const doctorsById = new Map(props.doctors.map((doctor) => [doctor.id, doctor] as const));
  const assignedTemplateByDate = Object.fromEntries(
    props.groupConstraints.map((constraint) => {
      const template = templatesById.get(constraint.templateId);

      return [
        constraint.date,
        {
          code: template?.code ?? "UNKNOWN",
          label: template?.label ?? "Unknown template"
        }
      ] as const;
    })
  );
  const excludedDoctorsByDate = buildExcludedDoctorsByDateLookup(
    props.excludedDoctorPeriods
  );
  const excludedDoctorIds = new Set(
    props.excludedDoctorPeriods.map((period) => period.doctorId)
  );
  const activeDoctors = props.doctors.filter((doctor) => doctor.isActive);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Step 2
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
          Group Constraints &amp; Exclusions
        </h3>
        <p className="text-sm text-slate-600">
          Apply reusable group-constraint templates to specific dates and add draft-only
          doctor exclusion periods that later shift allocation must respect.
        </p>
      </header>

      {props.isLoadingReferenceData ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          Loading doctor groups, doctors, and group constraint templates...
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-4">
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Template Assignment
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Choose an existing template, select dates, then apply it to those days.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Template</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={
                  props.isDisabled || props.isLoadingReferenceData || props.templates.length === 0
                }
                onChange={(event) => props.onSelectedTemplateIdChange(event.target.value)}
                value={props.selectedTemplateId}
              >
                <option value="">Select a template</option>
                {props.templates.map((template) => {
                  const allowedGroup = doctorGroupsById.get(
                    template.rules.allowedDoctorGroupId
                  );

                  return (
                    <option key={template.id} value={template.id}>
                      {template.code} | {template.label}
                      {allowedGroup ? ` | ${allowedGroup.name}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
                disabled={
                  props.isDisabled ||
                  props.isLoadingReferenceData ||
                  !props.selectedTemplateId ||
                  props.selectedDates.length === 0
                }
                onClick={props.onApplyTemplateToSelectedDates}
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
                Create Template
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Templates are global admin config and become immediately reusable in this
                wizard.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Code</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={props.isDisabled || props.isLoadingReferenceData}
                onChange={(event) => props.onNewTemplateFormChange("code", event.target.value)}
                type="text"
                value={props.newTemplateForm.code}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Label</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={props.isDisabled || props.isLoadingReferenceData}
                onChange={(event) => props.onNewTemplateFormChange("label", event.target.value)}
                type="text"
                value={props.newTemplateForm.label}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Allowed group</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={
                  props.isDisabled ||
                  props.isLoadingReferenceData ||
                  props.doctorGroups.length === 0
                }
                onChange={(event) =>
                  props.onNewTemplateFormChange("allowedDoctorGroupId", event.target.value)
                }
                value={props.newTemplateForm.allowedDoctorGroupId}
              >
                <option value="">Select a group</option>
                {props.doctorGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                props.isDisabled ||
                props.isLoadingReferenceData ||
                props.doctorGroups.length === 0
              }
              onClick={() => void props.onCreateTemplate()}
              type="button"
            >
              {props.activeAction === "create-template"
                ? "Creating Template..."
                : "Create Template"}
            </button>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Doctor Exclusions
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Exclusions only affect this wizard draft. They do not create leave
                records.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Doctor</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={props.isDisabled || props.isLoadingReferenceData}
                onChange={(event) => props.onExclusionFormChange("doctorId", event.target.value)}
                value={props.exclusionForm.doctorId}
              >
                <option value="">Select an active doctor</option>
                {activeDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Start date</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={props.isDisabled || props.isLoadingReferenceData}
                  max={props.effectiveRange.endDate}
                  min={props.effectiveRange.startDate}
                  onChange={(event) =>
                    props.onExclusionFormChange("startDate", event.target.value)
                  }
                  type="date"
                  value={props.exclusionForm.startDate}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">End date</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={props.isDisabled || props.isLoadingReferenceData}
                  max={props.effectiveRange.endDate}
                  min={props.effectiveRange.startDate}
                  onChange={(event) =>
                    props.onExclusionFormChange("endDate", event.target.value)
                  }
                  type="date"
                  value={props.exclusionForm.endDate}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Reason (optional)</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={props.isDisabled || props.isLoadingReferenceData}
                onChange={(event) => props.onExclusionFormChange("reason", event.target.value)}
                type="text"
                value={props.exclusionForm.reason}
              />
            </label>

            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={props.isDisabled || props.isLoadingReferenceData}
              onClick={props.onAddExclusion}
              type="button"
            >
              Add Exclusion
            </button>
          </section>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Constrained Dates
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {props.groupConstraints.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Templates In Use
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {new Set(props.groupConstraints.map((constraint) => constraint.templateId)).size}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Excluded Doctors
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {excludedDoctorIds.size}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Impacted Dates
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {countExcludedDoctorImpactDates(excludedDoctorsByDate)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 2xl:grid-cols-2">
            {renderedMonths.map((month) => (
              <RosterWizardConstraintCalendar
                assignedTemplateByDate={assignedTemplateByDate}
                isDisabled={props.isDisabled || props.isLoadingReferenceData}
                key={month}
                month={month}
                onToggleDateSelection={props.onToggleDateSelection}
                range={props.effectiveRange}
                selectedDates={props.selectedDates}
              />
            ))}
          </div>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Active Date Constraints
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                One template is stored per date. Clearing a row removes that mapping.
              </p>
            </div>

            <div className="space-y-3">
              {props.groupConstraints.length === 0 ? (
                <p className="text-sm text-slate-500">No date constraints assigned yet.</p>
              ) : (
                props.groupConstraints.map((constraint) => {
                  const template = templatesById.get(constraint.templateId);
                  const allowedGroup = template
                    ? doctorGroupsById.get(template.rules.allowedDoctorGroupId)
                    : null;

                  return (
                    <article
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      key={constraint.date}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatRosterDate(constraint.date)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {template?.code ?? "Unknown"} | {template?.label ?? "Unknown template"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Allowed group: {allowedGroup?.name ?? "Unknown group"}
                        </p>
                      </div>

                      <button
                        className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={props.isDisabled}
                        onClick={() => props.onClearGroupConstraint(constraint.date)}
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

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Exclusion Periods
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                These exclusions are clipped to the Step 1 range when the draft is saved.
              </p>
            </div>

            <div className="space-y-3">
              {props.excludedDoctorPeriods.length === 0 ? (
                <p className="text-sm text-slate-500">No doctor exclusions added yet.</p>
              ) : (
                props.excludedDoctorPeriods.map((period) => (
                  <article
                    className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    key={period.id}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {doctorsById.get(period.doctorId)?.name ?? period.doctorId}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatRosterDate(period.startDate)} to {formatRosterDate(period.endDate)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {period.reason?.trim() || "No reason provided"}
                      </p>
                    </div>

                    <button
                      className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={props.isDisabled}
                      onClick={() => props.onRemoveExclusion(period.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
