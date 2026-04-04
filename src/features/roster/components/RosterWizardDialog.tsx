import { useEffect } from "react";
import type {
  Doctor,
  DoctorGroup,
  DutyDesign,
  EntityId,
  GroupConstraintTemplate,
  ISODateString,
  RosterPeriod,
  RosterWizardDraft,
  RosterWizardStep,
  YearMonthString
} from "@/domain/models";
import { RosterWizardStepOne } from "@/features/roster/components/RosterWizardStepOne";
import { RosterWizardStepFour } from "@/features/roster/components/RosterWizardStepFour";
import { RosterWizardStepFive } from "@/features/roster/components/RosterWizardStepFive";
import { RosterWizardStepTwo } from "@/features/roster/components/RosterWizardStepTwo";
import { RosterWizardStepThree } from "@/features/roster/components/RosterWizardStepThree";
import { RosterWizardStepPlaceholder } from "@/features/roster/components/RosterWizardStepPlaceholder";
import {
  ROSTER_WIZARD_STEP_DEFINITIONS,
  RosterWizardStepper
} from "@/features/roster/components/RosterWizardStepper";
import { formatDateTime, formatRosterMonth } from "@/features/roster/lib/formatters";
import type { RosterWizardStepOneState } from "@/features/roster/lib/rosterWizardStepOne";
import type { RosterWizardStepTwoState } from "@/features/roster/lib/rosterWizardStepTwo";
import type { RosterWizardStepThreeState } from "@/features/roster/lib/rosterWizardStepThree";
import type {
  RosterWizardStepFourPreview,
  RosterWizardStepFourShiftDetails,
  RosterWizardStepFiveReview
} from "@/features/roster/services/rosterWizardService";

interface RosterWizardDialogProps {
  readonly isOpen: boolean;
  readonly draft: RosterWizardDraft | null;
  readonly draftName: string;
  readonly errorMessage: string | null;
  readonly successMessage: string | null;
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
  readonly stepOneState: RosterWizardStepOneState;
  readonly stepTwoState: RosterWizardStepTwoState;
  readonly stepThreeState: RosterWizardStepThreeState;
  readonly stepFourPreview: RosterWizardStepFourPreview | null;
  readonly stepFiveReview: RosterWizardStepFiveReview | null;
  readonly selectedShiftId: string | null;
  readonly selectedShiftDetails: RosterWizardStepFourShiftDetails | null;
  readonly stepOneEffectiveRange: RosterPeriod;
  readonly groupConstraintTemplates: ReadonlyArray<GroupConstraintTemplate>;
  readonly doctorGroups: ReadonlyArray<DoctorGroup>;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly isLoadingStepTwoReferenceData: boolean;
  readonly isLoadingStepThreeReferenceData: boolean;
  readonly isLoadingStepFourPreview: boolean;
  readonly isLoadingStepFourShiftDetails: boolean;
  readonly isLoadingStepFiveReview: boolean;
  readonly selectedStepTwoTemplateId: string;
  readonly selectedStepTwoDates: ReadonlyArray<ISODateString>;
  readonly selectedStepThreeDutyDesignId: string;
  readonly stepThreeAssignmentMode: "standard" | "holiday-override";
  readonly selectedStepThreeDates: ReadonlyArray<ISODateString>;
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
  readonly canProceedToNextStep: boolean;
  readonly onDraftNameChange: (value: string) => void;
  readonly onStepOneRosterMonthChange: (value: YearMonthString) => void;
  readonly onStepOneRangeModeChange: (mode: "full-month" | "custom") => void;
  readonly onStepOneCustomRangeChange: (
    field: "startDate" | "endDate",
    value: string
  ) => void;
  readonly onStepOneToggleHoliday: (date: ISODateString) => void;
  readonly onStepOneClearHolidays: () => void;
  readonly onStepTwoSelectedTemplateIdChange: (value: string) => void;
  readonly onStepTwoToggleDateSelection: (date: ISODateString) => void;
  readonly onStepTwoApplyTemplateToSelectedDates: () => void;
  readonly onStepTwoClearDateSelection: () => void;
  readonly onStepTwoClearGroupConstraint: (date: ISODateString) => void;
  readonly onStepTwoNewTemplateFormChange: (
    field: "code" | "label" | "allowedDoctorGroupId",
    value: string
  ) => void;
  readonly onStepTwoCreateTemplate: () => void | Promise<unknown>;
  readonly onStepTwoExclusionFormChange: (
    field: "doctorId" | "startDate" | "endDate" | "reason",
    value: string
  ) => void;
  readonly onStepTwoAddExclusion: () => void;
  readonly onStepTwoRemoveExclusion: (id: EntityId) => void;
  readonly onStepThreeSelectedDutyDesignIdChange: (value: string) => void;
  readonly onStepThreeAssignmentModeChange: (
    value: "standard" | "holiday-override"
  ) => void;
  readonly onStepThreeToggleDateSelection: (date: ISODateString) => void;
  readonly onStepThreeApplyAssignmentToSelectedDates: () => void;
  readonly onStepThreeClearDateSelection: () => void;
  readonly onStepThreeClearAssignment: (
    date: ISODateString,
    mode: "standard" | "holiday-override"
  ) => void;
  readonly onStepFourOpenShift: (shiftId: string) => void;
  readonly onStepFourCloseShift: () => void;
  readonly onStepFourAssignDoctor: (doctorId: string | null) => void | Promise<unknown>;
  readonly onClose: () => void | Promise<unknown>;
  readonly onStepSelect: (step: RosterWizardStep) => void | Promise<unknown>;
  readonly onPreviousStep: () => void | Promise<unknown>;
  readonly onNextStep: () => void | Promise<unknown>;
  readonly onPublish: () => void | Promise<unknown>;
  readonly onUnlock: () => void | Promise<unknown>;
  readonly onDelete: () => void | Promise<unknown>;
}

function getStatusClasses(status: RosterWizardDraft["status"]): string {
  switch (status) {
    case "LOCKED":
      return "bg-slate-900 text-white";
    case "PUBLISHED":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-emerald-100 text-emerald-900";
  }
}

export function RosterWizardDialog(props: RosterWizardDialogProps) {
  const draft = props.draft;

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && props.activeAction === null) {
        void props.onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.activeAction, props.isOpen, props.onClose]);

  if (!props.isOpen || !draft) {
    return null;
  }

  const isLocked = draft.status === "LOCKED";
  const isBusy = props.activeAction !== null;
  const canGoBack = draft.currentStep > 1 && !isLocked && !isBusy;
  const canGoNext =
    draft.currentStep < 5 &&
    !isLocked &&
    !isBusy &&
    (draft.currentStep !== 1 || props.canProceedToNextStep);
  const currentDefinition = ROSTER_WIZARD_STEP_DEFINITIONS.find(
    (definition) => definition.step === draft.currentStep
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 p-4"
      onClick={() => {
        if (!isBusy) {
          void props.onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
                Roster Wizard
              </p>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                  getStatusClasses(draft.status)
                ].join(" ")}
              >
                {draft.status}
              </span>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Draft name</span>
              <input
                className="w-full min-w-[18rem] rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLocked || isBusy}
                onChange={(event) => props.onDraftNameChange(event.target.value)}
                type="text"
                value={props.draftName}
              />
            </label>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <p>{formatRosterMonth(draft.rosterMonth)}</p>
              <p>Step {draft.currentStep} of 5</p>
              <p>Updated {formatDateTime(draft.updatedAt)}</p>
              <p>{currentDefinition?.title ?? "Wizard step"}</p>
            </div>
          </div>

          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={() => void props.onClose()}
            type="button"
          >
            Close
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[20rem_1fr]">
          <div className="min-h-0 overflow-auto">
            <RosterWizardStepper
              currentStep={draft.currentStep}
              status={draft.status}
              isBusy={isBusy}
              onStepSelect={props.onStepSelect}
            />
          </div>

          <div className="min-h-0 overflow-auto">
            <div className="space-y-4">
              {props.errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {props.errorMessage}
                </div>
              ) : null}

              {props.successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {props.successMessage}
                </div>
              ) : null}

              {draft.currentStep === 1 ? (
                <RosterWizardStepOne
                  isDisabled={isLocked || isBusy}
                  onClearHolidays={props.onStepOneClearHolidays}
                  onCustomRangeChange={props.onStepOneCustomRangeChange}
                  onRangeModeChange={props.onStepOneRangeModeChange}
                  onRosterMonthChange={props.onStepOneRosterMonthChange}
                  onToggleHoliday={props.onStepOneToggleHoliday}
                  state={props.stepOneState}
                />
              ) : draft.currentStep === 2 ? (
                <RosterWizardStepTwo
                  activeAction={props.activeAction}
                  doctorGroups={props.doctorGroups}
                  doctors={props.doctors}
                  effectiveRange={props.stepOneEffectiveRange}
                  exclusionForm={props.exclusionForm}
                  excludedDoctorPeriods={props.stepTwoState.excludedDoctorPeriods}
                  groupConstraints={props.stepTwoState.groupConstraints}
                  isDisabled={isLocked || isBusy}
                  isLoadingReferenceData={props.isLoadingStepTwoReferenceData}
                  newTemplateForm={props.newTemplateForm}
                  onAddExclusion={props.onStepTwoAddExclusion}
                  onApplyTemplateToSelectedDates={props.onStepTwoApplyTemplateToSelectedDates}
                  onClearDateSelection={props.onStepTwoClearDateSelection}
                  onClearGroupConstraint={props.onStepTwoClearGroupConstraint}
                  onCreateTemplate={props.onStepTwoCreateTemplate}
                  onExclusionFormChange={props.onStepTwoExclusionFormChange}
                  onNewTemplateFormChange={props.onStepTwoNewTemplateFormChange}
                  onRemoveExclusion={props.onStepTwoRemoveExclusion}
                  onSelectedTemplateIdChange={props.onStepTwoSelectedTemplateIdChange}
                  onToggleDateSelection={props.onStepTwoToggleDateSelection}
                  selectedDates={props.selectedStepTwoDates}
                  selectedTemplateId={props.selectedStepTwoTemplateId}
                  templates={props.groupConstraintTemplates}
                />
              ) : draft.currentStep === 3 ? (
                <RosterWizardStepThree
                  assignmentMode={props.stepThreeAssignmentMode}
                  dutyDesignAssignments={props.stepThreeState.dutyDesignAssignments}
                  dutyDesigns={props.dutyDesigns}
                  effectiveRange={props.stepOneEffectiveRange}
                  isDisabled={isLocked || isBusy}
                  isLoadingReferenceData={props.isLoadingStepThreeReferenceData}
                  onApplyAssignmentToSelectedDates={
                    props.onStepThreeApplyAssignmentToSelectedDates
                  }
                  onAssignmentModeChange={props.onStepThreeAssignmentModeChange}
                  onClearAssignment={props.onStepThreeClearAssignment}
                  onClearDateSelection={props.onStepThreeClearDateSelection}
                  onSelectedDutyDesignIdChange={
                    props.onStepThreeSelectedDutyDesignIdChange
                  }
                  onToggleDateSelection={props.onStepThreeToggleDateSelection}
                  publicHolidayDates={props.stepOneState.publicHolidayDates}
                  selectedDates={props.selectedStepThreeDates}
                  selectedDutyDesignId={props.selectedStepThreeDutyDesignId}
                />
              ) : draft.currentStep === 4 ? (
                <RosterWizardStepFour
                  doctorGroups={props.doctorGroups}
                  isDisabled={isLocked || isBusy}
                  isLoadingPreview={props.isLoadingStepFourPreview}
                  isLoadingShiftDetails={props.isLoadingStepFourShiftDetails || isBusy}
                  onAssignDoctor={props.onStepFourAssignDoctor}
                  onCloseShift={props.onStepFourCloseShift}
                  onOpenShift={props.onStepFourOpenShift}
                  preview={props.stepFourPreview}
                  selectedShiftDetails={props.selectedShiftDetails}
                  selectedShiftId={props.selectedShiftId}
                />
              ) : draft.currentStep === 5 ? (
                <RosterWizardStepFive
                  activeAction={props.activeAction}
                  doctorGroups={props.doctorGroups}
                  isDisabled={isLocked || isBusy}
                  isLoadingReview={props.isLoadingStepFiveReview}
                  onEditStep={props.onStepSelect}
                  onPublish={props.onPublish}
                  review={props.stepFiveReview}
                  status={draft.status}
                />
              ) : (
                <RosterWizardStepPlaceholder currentStep={draft.currentStep} />
              )}
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {draft.status === "LOCKED" ? (
              <button
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => void props.onUnlock()}
                type="button"
              >
                {props.activeAction === "unlock" ? "Unlocking..." : "Unlock Draft"}
              </button>
            ) : null}

            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete wizard draft '${draft.name}'? This removes the saved wizard progress.`
                  )
                ) {
                  void props.onDelete();
                }
              }}
              type="button"
            >
              {props.activeAction === "delete" ? "Deleting..." : "Delete Draft"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canGoBack}
              onClick={() => void props.onPreviousStep()}
              type="button"
            >
              Back
            </button>
            <button
              className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-400"
              disabled={!canGoNext}
              onClick={() => void props.onNextStep()}
              type="button"
            >
              {props.activeAction === "save" ? "Saving..." : "Next"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
