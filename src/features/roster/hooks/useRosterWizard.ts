import { useEffect, useState } from "react";
import type {
  Doctor,
  DoctorGroup,
  DutyDesign,
  EntityId,
  GroupConstraintTemplate,
  ISODateString,
  RosterWizardDraft,
  RosterWizardStep,
  RosterPeriod,
  YearMonthString
} from "@/domain/models";
import { useAppServices } from "@/app/providers/useAppServices";
import { getAdminOperationErrorMessage } from "@/features/admin/services/adminOperationErrorMessage";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  buildRosterWizardStepOneState,
  filterRosterWizardHolidayDatesToRange,
  getRosterWizardStepOneFullMonthRange,
  getRosterWizardStepOneValidationMessage,
  getRosterWizardStepOneViewRange,
  isDateWithinRosterWizardRange,
  normalizeRosterWizardHolidayDates,
  type RosterWizardStepOneState
} from "@/features/roster/lib/rosterWizardStepOne";
import {
  buildRosterWizardStepTwoState,
  pruneRosterWizardStepTwoStateToRange,
  type RosterWizardStepTwoState
} from "@/features/roster/lib/rosterWizardStepTwo";
import {
  buildRosterWizardStepThreeState,
  pruneRosterWizardStepThreeStateToRange,
  type RosterWizardStepThreeState
} from "@/features/roster/lib/rosterWizardStepThree";
import type {
  RosterWizardStepFourPreview,
  RosterWizardStepFourShiftDetails,
  RosterWizardStepFiveReview
} from "@/features/roster/services/rosterWizardService";

type RosterWizardAction =
  | "create"
  | "open"
  | "save"
  | "create-template"
  | "publish"
  | "lock"
  | "unlock"
  | "delete"
  | null;

function getCurrentRosterMonth(): YearMonthString {
  return new Date().toISOString().slice(0, 7) as YearMonthString;
}

function sortDrafts(
  drafts: ReadonlyArray<RosterWizardDraft>
): ReadonlyArray<RosterWizardDraft> {
  return [...drafts].sort((left, right) => {
    const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }

    const createdAtComparison = right.createdAt.localeCompare(left.createdAt);
    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.id.localeCompare(right.id);
  });
}

function createInitialStepOneState(rosterMonth: YearMonthString): RosterWizardStepOneState {
  return buildRosterWizardStepOneState({
    rosterMonth,
    publicHolidayDates: []
  });
}

function createInitialStepTwoState(): RosterWizardStepTwoState {
  return buildRosterWizardStepTwoState({
    groupConstraints: [],
    excludedDoctorPeriods: []
  });
}

function createInitialStepThreeState(): RosterWizardStepThreeState {
  return buildRosterWizardStepThreeState({
    dutyDesignAssignments: []
  });
}

function createInitialTemplateForm() {
  return {
    code: "",
    label: "",
    allowedDoctorGroupId: ""
  };
}

function createInitialExclusionForm(effectiveRange?: RosterPeriod) {
  return {
    doctorId: "",
    startDate: effectiveRange?.startDate ?? "",
    endDate: effectiveRange?.startDate ?? "",
    reason: ""
  };
}

export function useRosterWizard() {
  const {
    doctorGroupManagementService,
    doctorManagementService,
    dutyDesignManagementService,
    groupConstraintTemplateManagementService,
    rosterWizardService
  } = useAppServices();
  const { user, role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<YearMonthString>(
    getCurrentRosterMonth()
  );
  const [drafts, setDrafts] = useState<ReadonlyArray<RosterWizardDraft>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<RosterWizardAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<RosterWizardDraft | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [stepOneState, setStepOneState] = useState<RosterWizardStepOneState>(() =>
    createInitialStepOneState(getCurrentRosterMonth())
  );
  const [stepTwoState, setStepTwoState] = useState<RosterWizardStepTwoState>(() =>
    createInitialStepTwoState()
  );
  const [stepThreeState, setStepThreeState] = useState<RosterWizardStepThreeState>(() =>
    createInitialStepThreeState()
  );
  const [stepFourPreview, setStepFourPreview] =
    useState<RosterWizardStepFourPreview | null>(null);
  const [stepFiveReview, setStepFiveReview] =
    useState<RosterWizardStepFiveReview | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedShiftDetails, setSelectedShiftDetails] =
    useState<RosterWizardStepFourShiftDetails | null>(null);
  const [groupConstraintTemplates, setGroupConstraintTemplates] = useState<
    ReadonlyArray<GroupConstraintTemplate>
  >([]);
  const [doctorGroups, setDoctorGroups] = useState<ReadonlyArray<DoctorGroup>>([]);
  const [doctors, setDoctors] = useState<ReadonlyArray<Doctor>>([]);
  const [dutyDesigns, setDutyDesigns] = useState<ReadonlyArray<DutyDesign>>([]);
  const [isLoadingStepTwoReferenceData, setIsLoadingStepTwoReferenceData] =
    useState(true);
  const [isLoadingStepThreeReferenceData, setIsLoadingStepThreeReferenceData] =
    useState(true);
  const [isLoadingStepFourPreview, setIsLoadingStepFourPreview] = useState(false);
  const [isLoadingStepFourShiftDetails, setIsLoadingStepFourShiftDetails] =
    useState(false);
  const [isLoadingStepFiveReview, setIsLoadingStepFiveReview] = useState(false);
  const [selectedStepTwoTemplateId, setSelectedStepTwoTemplateId] = useState("");
  const [selectedStepTwoDates, setSelectedStepTwoDates] = useState<
    ReadonlyArray<ISODateString>
  >([]);
  const [selectedStepThreeDutyDesignId, setSelectedStepThreeDutyDesignId] =
    useState("");
  const [stepThreeAssignmentMode, setStepThreeAssignmentMode] = useState<
    "standard" | "holiday-override"
  >("standard");
  const [selectedStepThreeDates, setSelectedStepThreeDates] = useState<
    ReadonlyArray<ISODateString>
  >([]);
  const [newTemplateForm, setNewTemplateForm] = useState(createInitialTemplateForm);
  const [exclusionForm, setExclusionForm] = useState(() =>
    createInitialExclusionForm(getRosterWizardStepOneViewRange(createInitialStepOneState(getCurrentRosterMonth())))
  );

  function getCurrentStepOneViewRange(
    currentState: Pick<
      RosterWizardStepOneState,
      "rosterMonth" | "isCustomRangeEnabled" | "customRange"
    > = stepOneState
  ): RosterPeriod {
    return getRosterWizardStepOneViewRange(currentState);
  }

  function pruneDependentWizardState(
    nextRange: RosterPeriod,
    nextHolidayDates: ReadonlyArray<ISODateString>,
    options: {
      readonly resetExclusionForm: boolean;
    }
  ) {
    setStepTwoState((currentState) =>
      pruneRosterWizardStepTwoStateToRange({
        effectiveRange: nextRange,
        groupConstraints: currentState.groupConstraints,
        excludedDoctorPeriods: currentState.excludedDoctorPeriods
      })
    );
    setStepThreeState((currentState) =>
      pruneRosterWizardStepThreeStateToRange({
        effectiveRange: nextRange,
        publicHolidayDates: nextHolidayDates,
        dutyDesignAssignments: currentState.dutyDesignAssignments
      })
    );
    setSelectedStepTwoDates((currentDates) =>
      currentDates.filter((date) => isDateWithinRosterWizardRange(date, nextRange))
    );
    setSelectedStepThreeDates((currentDates) =>
      currentDates.filter((date) => isDateWithinRosterWizardRange(date, nextRange))
    );
    setStepFourPreview(null);
    setStepFiveReview(null);
    setSelectedShiftId(null);
    setSelectedShiftDetails(null);

    if (options.resetExclusionForm) {
      setExclusionForm((currentForm) => ({
        ...currentForm,
        startDate: nextRange.startDate,
        endDate: nextRange.startDate
      }));
    }
  }

  function setActiveDraftState(draft: RosterWizardDraft | null) {
    setActiveDraft(draft);
    setDraftName(draft?.name ?? "");
    const nextStepOneState = draft
      ? buildRosterWizardStepOneState({
          rosterMonth: draft.rosterMonth,
          customRange: draft.customRange,
          publicHolidayDates: draft.publicHolidayDates
        })
      : createInitialStepOneState(selectedMonth);
    const nextEffectiveRange = getRosterWizardStepOneViewRange(nextStepOneState);

    setStepOneState(nextStepOneState);
    setStepTwoState(
      draft
        ? buildRosterWizardStepTwoState({
            groupConstraints: draft.groupConstraints,
            excludedDoctorPeriods: draft.excludedDoctorPeriods
          })
        : createInitialStepTwoState()
    );
    setStepThreeState(
      draft
        ? buildRosterWizardStepThreeState({
            dutyDesignAssignments: draft.dutyDesignAssignments
          })
        : createInitialStepThreeState()
    );
    setSelectedStepTwoTemplateId("");
    setSelectedStepTwoDates([]);
    setSelectedStepThreeDutyDesignId("");
    setStepThreeAssignmentMode("standard");
    setSelectedStepThreeDates([]);
    setNewTemplateForm(createInitialTemplateForm());
    setExclusionForm(createInitialExclusionForm(nextEffectiveRange));
    setStepFourPreview(null);
    setStepFiveReview(null);
    setSelectedShiftId(null);
    setSelectedShiftDetails(null);
  }

  function upsertDraft(nextDraft: RosterWizardDraft) {
    setDrafts((currentDrafts) =>
      sortDrafts([
        ...currentDrafts.filter((draft) => draft.id !== nextDraft.id),
        nextDraft
      ])
    );
  }

  function removeDraft(draftId: string) {
    setDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId));
  }

  async function loadDrafts(showLoadingState = true) {
    if (!user || role !== "ADMIN") {
      setDrafts([]);
      setActiveDraftState(null);
      setIsDialogOpen(false);
      setIsLoading(false);
      setGroupConstraintTemplates([]);
      setDoctorGroups([]);
      setDoctors([]);
      setDutyDesigns([]);
      setIsLoadingStepTwoReferenceData(false);
      setIsLoadingStepThreeReferenceData(false);
      setStepFourPreview(null);
      setStepFiveReview(null);
      setSelectedShiftId(null);
      setSelectedShiftDetails(null);
      setIsLoadingStepFourPreview(false);
      setIsLoadingStepFourShiftDetails(false);
      setIsLoadingStepFiveReview(false);
      return [];
    }

    if (showLoadingState) {
      setIsLoading(true);
    }

    try {
      const nextDrafts = await rosterWizardService.listDraftsByAdmin({
        actorId: user.id,
        actorRole: role
      });
      setDrafts(nextDrafts);

      if (activeDraft) {
        const refreshedDraft =
          nextDrafts.find((draft) => draft.id === activeDraft.id) ?? null;

        if (!refreshedDraft) {
          setActiveDraftState(null);
          setIsDialogOpen(false);
        } else {
          setActiveDraftState(refreshedDraft);
        }
      }

      return nextDrafts;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load roster wizard drafts.")
      );
      return [];
    } finally {
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadDrafts();
    void loadStepTwoReferenceData();
    void loadStepThreeReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rosterWizardService,
    groupConstraintTemplateManagementService,
    doctorGroupManagementService,
    dutyDesignManagementService,
    doctorManagementService,
    user?.id,
    role
  ]);

  async function loadStepTwoReferenceData() {
    if (!user || role !== "ADMIN") {
      setGroupConstraintTemplates([]);
      setDoctorGroups([]);
      setDoctors([]);
      setIsLoadingStepTwoReferenceData(false);
      return;
    }

    setIsLoadingStepTwoReferenceData(true);

    try {
      const [templates, nextDoctorGroups, nextDoctors] = await Promise.all([
        groupConstraintTemplateManagementService.listGroupConstraintTemplates(),
        doctorGroupManagementService.listDoctorGroups(),
        doctorManagementService.listDoctors()
      ]);

      setGroupConstraintTemplates(templates);
      setDoctorGroups(nextDoctorGroups);
      setDoctors(nextDoctors);
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(
          error,
          "Unable to load wizard group constraints and exclusions."
        )
      );
    } finally {
      setIsLoadingStepTwoReferenceData(false);
    }
  }

  async function loadStepThreeReferenceData() {
    if (!user || role !== "ADMIN") {
      setDutyDesigns([]);
      setIsLoadingStepThreeReferenceData(false);
      return;
    }

    setIsLoadingStepThreeReferenceData(true);

    try {
      const nextDutyDesigns = await dutyDesignManagementService.listDutyDesigns();
      setDutyDesigns(nextDutyDesigns);
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load wizard duty designs.")
      );
    } finally {
      setIsLoadingStepThreeReferenceData(false);
    }
  }

  async function loadStepFourPreview(draft: RosterWizardDraft) {
    if (!user || role !== "ADMIN") {
      setStepFourPreview(null);
      setIsLoadingStepFourPreview(false);
      return null;
    }

    setIsLoadingStepFourPreview(true);

    try {
      const preview = await rosterWizardService.loadStepFourPreview({
        draftId: draft.id,
        actorId: user.id,
        actorRole: role
      });
      setStepFourPreview(preview);
      return preview;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load Step 4 shift allocation.")
      );
      setStepFourPreview(null);
      return null;
    } finally {
      setIsLoadingStepFourPreview(false);
    }
  }

  async function loadStepFourShiftDetails(shiftId: string, draftId: string) {
    if (!user || role !== "ADMIN") {
      setSelectedShiftDetails(null);
      setIsLoadingStepFourShiftDetails(false);
      return null;
    }

    setIsLoadingStepFourShiftDetails(true);

    try {
      const details = await rosterWizardService.loadStepFourShiftDetails({
        draftId,
        shiftId,
        actorId: user.id,
        actorRole: role
      });
      setSelectedShiftDetails(details);
      return details;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load shift assignment details.")
      );
      setSelectedShiftDetails(null);
      return null;
    } finally {
      setIsLoadingStepFourShiftDetails(false);
    }
  }

  async function loadStepFiveReview(draft: RosterWizardDraft) {
    if (!user || role !== "ADMIN") {
      setStepFiveReview(null);
      setIsLoadingStepFiveReview(false);
      return null;
    }

    setIsLoadingStepFiveReview(true);

    try {
      const review = await rosterWizardService.loadStepFiveReview({
        draftId: draft.id,
        actorId: user.id,
        actorRole: role
      });
      setStepFiveReview(review);
      return review;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to load Step 5 review data.")
      );
      setStepFiveReview(null);
      return null;
    } finally {
      setIsLoadingStepFiveReview(false);
    }
  }

  function openStepFourShift(shiftId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedShiftId(shiftId);
    setSelectedShiftDetails(null);
  }

  function closeStepFourShift() {
    setSelectedShiftId(null);
    setSelectedShiftDetails(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function assignStepFourDoctor(doctorId: EntityId | null) {
    if (!activeDraft || !selectedShiftId || !user || role !== "ADMIN") {
      return null;
    }

    setActiveAction("save");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await rosterWizardService.setManualShiftAssignment({
        draftId: activeDraft.id,
        shiftId: selectedShiftId,
        doctorId,
        actorId: user.id,
        actorRole: role
      });

      upsertDraft(result.draft);
      setActiveDraft(result.draft);
      setDraftName(result.draft.name);
      setStepFourPreview(result.preview);
      setSuccessMessage(
        doctorId === null
          ? "Shift assignment cleared."
          : "Shift assignment updated."
      );

      return result.draft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to update the shift assignment.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  useEffect(() => {
    if (!isDialogOpen || !activeDraft || activeDraft.currentStep !== 4) {
      setStepFourPreview(null);
      setSelectedShiftId(null);
      setSelectedShiftDetails(null);
      setIsLoadingStepFourPreview(false);
      setIsLoadingStepFourShiftDetails(false);
      return;
    }

    void loadStepFourPreview(activeDraft);
  }, [
    activeDraft?.id,
    activeDraft?.updatedAt,
    activeDraft?.currentStep,
    isDialogOpen,
    role,
    rosterWizardService,
    user?.id
  ]);

  useEffect(() => {
    if (!isDialogOpen || !activeDraft || activeDraft.currentStep !== 5) {
      setStepFiveReview(null);
      setIsLoadingStepFiveReview(false);
      return;
    }

    void loadStepFiveReview(activeDraft);
  }, [
    activeDraft?.id,
    activeDraft?.updatedAt,
    activeDraft?.currentStep,
    isDialogOpen,
    role,
    rosterWizardService,
    user?.id
  ]);

  useEffect(() => {
    if (
      !isDialogOpen ||
      !activeDraft ||
      activeDraft.currentStep !== 4 ||
      !selectedShiftId
    ) {
      setSelectedShiftDetails(null);
      setIsLoadingStepFourShiftDetails(false);
      return;
    }

    void loadStepFourShiftDetails(selectedShiftId, activeDraft.id);
  }, [
    activeDraft?.id,
    activeDraft?.updatedAt,
    activeDraft?.currentStep,
    isDialogOpen,
    role,
    rosterWizardService,
    selectedShiftId,
    user?.id
  ]);

  async function createDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    setActiveAction("create");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const createdDraft = await rosterWizardService.createDraft({
        rosterMonth: selectedMonth,
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(createdDraft);
      setActiveDraftState(createdDraft);
      setIsDialogOpen(true);
      setSuccessMessage(`Created wizard draft '${createdDraft.name}'.`);
      return createdDraft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to create wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function openDraft(draftId: string) {
    if (!user || role !== "ADMIN") {
      return null;
    }

    setActiveAction("open");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const draft = await rosterWizardService.loadDraftById({
        draftId,
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(draft);
      setActiveDraftState(draft);
      setIsDialogOpen(true);
      return draft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to open wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function flushDraftNameChanges() {
    if (!activeDraft || !user || role !== "ADMIN" || activeDraft.status === "LOCKED") {
      return activeDraft;
    }

    const normalizedDraftName = draftName.trim();

    if (normalizedDraftName === activeDraft.name) {
      return activeDraft;
    }

    setActiveAction("save");
    setErrorMessage(null);

    try {
      const savedDraft = await rosterWizardService.saveDraftStep({
        draftId: activeDraft.id,
        currentStep: activeDraft.currentStep,
        changes: {
          name: normalizedDraftName
        },
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(savedDraft);
      setActiveDraftState(savedDraft);
      return savedDraft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to save wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  function hasPendingStepOneChanges(draft: RosterWizardDraft): boolean {
    const persistedState = buildRosterWizardStepOneState({
      rosterMonth: draft.rosterMonth,
      customRange: draft.customRange,
      publicHolidayDates: draft.publicHolidayDates
    });
    const normalizedCurrentHolidayDates = normalizeRosterWizardHolidayDates(
      stepOneState.publicHolidayDates
    );

    return (
      persistedState.rosterMonth !== stepOneState.rosterMonth ||
      persistedState.isCustomRangeEnabled !== stepOneState.isCustomRangeEnabled ||
      persistedState.customRange.startDate !== stepOneState.customRange.startDate ||
      persistedState.customRange.endDate !== stepOneState.customRange.endDate ||
      persistedState.publicHolidayDates.length !== normalizedCurrentHolidayDates.length ||
      persistedState.publicHolidayDates.some(
        (date, index) => date !== normalizedCurrentHolidayDates[index]
      )
    );
  }

  function hasPendingStepTwoChanges(draft: RosterWizardDraft): boolean {
    const persistedState = buildRosterWizardStepTwoState({
      groupConstraints: draft.groupConstraints,
      excludedDoctorPeriods: draft.excludedDoctorPeriods
    });

    if (persistedState.groupConstraints.length !== stepTwoState.groupConstraints.length) {
      return true;
    }

    if (
      persistedState.excludedDoctorPeriods.length !==
      stepTwoState.excludedDoctorPeriods.length
    ) {
      return true;
    }

    const hasChangedGroupConstraint = persistedState.groupConstraints.some(
      (constraint, index) =>
        constraint.date !== stepTwoState.groupConstraints[index]?.date ||
        constraint.templateId !== stepTwoState.groupConstraints[index]?.templateId
    );

    if (hasChangedGroupConstraint) {
      return true;
    }

    return persistedState.excludedDoctorPeriods.some((period, index) => {
      const currentPeriod = stepTwoState.excludedDoctorPeriods[index];

      return (
        period.id !== currentPeriod?.id ||
        period.doctorId !== currentPeriod.doctorId ||
        period.startDate !== currentPeriod.startDate ||
        period.endDate !== currentPeriod.endDate ||
        (period.reason ?? "") !== (currentPeriod.reason ?? "")
      );
    });
  }

  function hasPendingStepThreeChanges(draft: RosterWizardDraft): boolean {
    const persistedState = buildRosterWizardStepThreeState({
      dutyDesignAssignments: draft.dutyDesignAssignments
    });

    if (
      persistedState.dutyDesignAssignments.length !==
      stepThreeState.dutyDesignAssignments.length
    ) {
      return true;
    }

    return persistedState.dutyDesignAssignments.some((assignment, index) => {
      const currentAssignment = stepThreeState.dutyDesignAssignments[index];

      return (
        assignment.id !== currentAssignment?.id ||
        assignment.date !== currentAssignment.date ||
        assignment.dutyDesignId !== currentAssignment.dutyDesignId ||
        assignment.isHolidayOverride !== currentAssignment.isHolidayOverride ||
        assignment.createdAt !== currentAssignment.createdAt ||
        assignment.updatedAt !== currentAssignment.updatedAt
      );
    });
  }

  function buildCurrentStepSaveChanges() {
    const baseChanges = {
      name: draftName.trim()
    };

    if (!activeDraft) {
      return {
        changes: baseChanges,
        errorMessage: null as string | null
      };
    }

    if (activeDraft.currentStep === 2) {
      if (isLoadingStepTwoReferenceData) {
        return {
          changes: null,
          errorMessage: "Wizard reference data is still loading."
        };
      }

      return {
        changes: {
          ...baseChanges,
          groupConstraints: stepTwoState.groupConstraints,
          excludedDoctorPeriods: stepTwoState.excludedDoctorPeriods
        },
        errorMessage: null as string | null
      };
    }

    if (activeDraft.currentStep === 3) {
      if (isLoadingStepThreeReferenceData) {
        return {
          changes: null,
          errorMessage: "Duty designs are still loading."
        };
      }

      return {
        changes: {
          ...baseChanges,
          dutyDesignAssignments: stepThreeState.dutyDesignAssignments
        },
        errorMessage: null as string | null
      };
    }

    if (activeDraft.currentStep !== 1) {
      return {
        changes: baseChanges,
        errorMessage: null as string | null
      };
    }

    const validationMessage = getRosterWizardStepOneValidationMessage(stepOneState);

    if (validationMessage) {
      return {
        changes: null,
        errorMessage: validationMessage
      };
    }

    const effectiveRange = getRosterWizardStepOneViewRange(stepOneState);
    const publicHolidayDates = filterRosterWizardHolidayDatesToRange(
      stepOneState.publicHolidayDates,
      effectiveRange
    );

    return {
      changes: {
        ...baseChanges,
        rosterMonth: stepOneState.rosterMonth,
        customRange: stepOneState.isCustomRangeEnabled
          ? {
              startDate: stepOneState.customRange.startDate as ISODateString,
              endDate: stepOneState.customRange.endDate as ISODateString
            }
          : undefined,
        publicHolidayDates
      },
      errorMessage: null as string | null
    };
  }

  async function saveStep(currentStep: RosterWizardStep) {
    if (!activeDraft || !user || role !== "ADMIN") {
      return null;
    }

    const { changes, errorMessage: validationMessage } = buildCurrentStepSaveChanges();

    if (!changes) {
      setErrorMessage(validationMessage);
      setSuccessMessage(null);
      return null;
    }

    setActiveAction("save");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const savedDraft = await rosterWizardService.saveDraftStep({
        draftId: activeDraft.id,
        currentStep,
        changes,
        actorId: user.id,
        actorRole: role
      });
      upsertDraft(savedDraft);
      setActiveDraftState(savedDraft);
      return savedDraft;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to save wizard draft.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function closeDialog() {
    const shouldPersistBeforeClose =
      activeDraft?.status !== "LOCKED" &&
      activeDraft !== null &&
      (draftName.trim() !== activeDraft.name ||
        (activeDraft.currentStep === 1 && hasPendingStepOneChanges(activeDraft)) ||
        (activeDraft.currentStep === 2 && hasPendingStepTwoChanges(activeDraft)) ||
        (activeDraft.currentStep === 3 && hasPendingStepThreeChanges(activeDraft)));
    const persistedDraft =
      shouldPersistBeforeClose && activeDraft
        ? await saveStep(activeDraft.currentStep)
        : await flushDraftNameChanges();

    if (activeDraft && activeDraft.status !== "LOCKED" && persistedDraft === null) {
      return;
    }

    setIsDialogOpen(false);
    setActiveDraftState(null);
  }

  async function goToStep(step: RosterWizardStep) {
    if (!activeDraft || activeDraft.status === "LOCKED" || step === activeDraft.currentStep) {
      return;
    }

    await saveStep(step);
  }

  async function goToPreviousStep() {
    if (!activeDraft || activeDraft.currentStep === 1) {
      return;
    }

    await goToStep((activeDraft.currentStep - 1) as RosterWizardStep);
  }

  async function goToNextStep() {
    if (!activeDraft || activeDraft.currentStep === 5) {
      return;
    }

    await goToStep((activeDraft.currentStep + 1) as RosterWizardStep);
  }

  async function runStatusAction(
    action: Exclude<RosterWizardAction, null | "create" | "open" | "save">,
    work: (draftId: string) => Promise<RosterWizardDraft | void>,
    successText: string
  ) {
    if (!activeDraft || !user || role !== "ADMIN") {
      return null;
    }

    const shouldPersistBeforeAction =
      action !== "delete" &&
      action !== "unlock" &&
      (draftName.trim() !== activeDraft.name ||
        (activeDraft.currentStep === 1 && hasPendingStepOneChanges(activeDraft)) ||
        (activeDraft.currentStep === 2 && hasPendingStepTwoChanges(activeDraft)) ||
        (activeDraft.currentStep === 3 && hasPendingStepThreeChanges(activeDraft)));
    const persistedDraft = shouldPersistBeforeAction
      ? await saveStep(activeDraft.currentStep)
      : activeDraft;

    if (shouldPersistBeforeAction && !persistedDraft) {
      return null;
    }

    const draftId = persistedDraft?.id ?? activeDraft.id;

    setActiveAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await work(draftId);

      if (result) {
        upsertDraft(result);
        setActiveDraftState(result);
      } else {
        removeDraft(draftId);
        setIsDialogOpen(false);
        setActiveDraftState(null);
      }

      await loadDrafts(false);
      setSuccessMessage(successText);
      return result ?? null;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Wizard draft action failed.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  async function publishDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "publish",
      (draftId) =>
        rosterWizardService.publishDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        }),
      "Wizard draft published and locked."
    );
  }

  async function unlockDraft() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "unlock",
      (draftId) =>
        rosterWizardService.unlockDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        }),
      "Wizard draft unlocked."
    );
  }

  async function deleteDraft() {
    if (!activeDraft || !user || role !== "ADMIN") {
      return null;
    }

    return runStatusAction(
      "delete",
      async (draftId) => {
        await rosterWizardService.deleteDraft({
          draftId,
          actorId: user.id,
          actorRole: role
        });
      },
      "Wizard draft deleted."
    );
  }

  function setStepOneRosterMonth(value: YearMonthString) {
    setErrorMessage(null);
    setSuccessMessage(null);
    const fullMonthRange = getRosterWizardStepOneFullMonthRange(value);
    const nextHolidayDates = filterRosterWizardHolidayDatesToRange(
      stepOneState.publicHolidayDates,
      fullMonthRange
    );

    pruneDependentWizardState(fullMonthRange, nextHolidayDates, {
      resetExclusionForm: true
    });
    setStepOneState((currentState) => {
      return {
        rosterMonth: value,
        isCustomRangeEnabled: currentState.isCustomRangeEnabled,
        customRange: {
          startDate: fullMonthRange.startDate,
          endDate: fullMonthRange.endDate
        },
        publicHolidayDates: nextHolidayDates
      };
    });
  }

  function setStepOneRangeMode(mode: "full-month" | "custom") {
    setErrorMessage(null);
    setSuccessMessage(null);
    const fullMonthRange = getRosterWizardStepOneFullMonthRange(stepOneState.rosterMonth);
    const nextHolidayDates = filterRosterWizardHolidayDatesToRange(
      stepOneState.publicHolidayDates,
      fullMonthRange
    );

    pruneDependentWizardState(fullMonthRange, nextHolidayDates, {
      resetExclusionForm: true
    });
    setStepOneState((currentState) => {
      return {
        ...currentState,
        isCustomRangeEnabled: mode === "custom",
        customRange: {
          startDate: fullMonthRange.startDate,
          endDate: fullMonthRange.endDate
        },
        publicHolidayDates: nextHolidayDates
      };
    });
  }

  function setStepOneCustomRangeField(
    field: "startDate" | "endDate",
    value: string
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStepOneState((currentState) => {
      const nextState = {
        ...currentState,
        customRange: {
          ...currentState.customRange,
          [field]: value
        }
      };

      const validationMessage = getRosterWizardStepOneValidationMessage(nextState);

      if (validationMessage) {
        return {
          ...nextState,
          publicHolidayDates: normalizeRosterWizardHolidayDates(
            currentState.publicHolidayDates
          )
        };
      }

      return {
        ...nextState,
        publicHolidayDates: filterRosterWizardHolidayDatesToRange(
          currentState.publicHolidayDates,
          getRosterWizardStepOneViewRange(nextState)
        )
      };
    });
    const currentViewRange = getCurrentStepOneViewRange({
      ...stepOneState,
      customRange: {
        ...stepOneState.customRange,
        [field]: value
      }
    });
    const nextHolidayDates = filterRosterWizardHolidayDatesToRange(
      stepOneState.publicHolidayDates,
      currentViewRange
    );

    pruneDependentWizardState(currentViewRange, nextHolidayDates, {
      resetExclusionForm: true
    });
  }

  function toggleStepOneHoliday(date: ISODateString) {
    setErrorMessage(null);
    setSuccessMessage(null);
    const currentViewRange = getCurrentStepOneViewRange();

    setStepOneState((currentState) => {
      if (!isDateWithinRosterWizardRange(date, currentViewRange)) {
        return currentState;
      }

      const nextHolidayDates = currentState.publicHolidayDates.includes(date)
        ? currentState.publicHolidayDates.filter((entry) => entry !== date)
        : [...currentState.publicHolidayDates, date];

      const normalizedHolidayDates = normalizeRosterWizardHolidayDates(nextHolidayDates);

      pruneDependentWizardState(currentViewRange, normalizedHolidayDates, {
        resetExclusionForm: false
      });

      return {
        ...currentState,
        publicHolidayDates: normalizedHolidayDates
      };
    });
  }

  function clearStepOneHolidays() {
    setErrorMessage(null);
    setSuccessMessage(null);
    pruneDependentWizardState(getCurrentStepOneViewRange(), [], {
      resetExclusionForm: false
    });
    setStepOneState((currentState) => ({
      ...currentState,
      publicHolidayDates: []
    }));
  }

  function setStepTwoSelectedTemplateId(value: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedStepTwoTemplateId(value);
  }

  function toggleStepTwoDateSelection(date: ISODateString) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isDateWithinRosterWizardRange(date, getCurrentStepOneViewRange())) {
      return;
    }

    setSelectedStepTwoDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((entry) => entry !== date)
        : [...currentDates, date].sort()
    );
  }

  function clearStepTwoDateSelection() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedStepTwoDates([]);
  }

  function applyStepTwoTemplateToSelectedDates() {
    if (!selectedStepTwoTemplateId) {
      setErrorMessage("Choose a template before applying it to dates.");
      return;
    }

    if (selectedStepTwoDates.length === 0) {
      setErrorMessage("Select at least one date before applying a template.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setStepTwoState((currentState) => {
      const nextByDate = new Map(
        currentState.groupConstraints.map((constraint) => [constraint.date, constraint] as const)
      );

      selectedStepTwoDates.forEach((date) => {
        nextByDate.set(date, {
          date,
          templateId: selectedStepTwoTemplateId
        });
      });

      return buildRosterWizardStepTwoState({
        groupConstraints: Array.from(nextByDate.values()),
        excludedDoctorPeriods: currentState.excludedDoctorPeriods
      });
    });
    setSelectedStepTwoDates([]);
  }

  function clearStepTwoGroupConstraint(date: ISODateString) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStepTwoState((currentState) =>
      buildRosterWizardStepTwoState({
        groupConstraints: currentState.groupConstraints.filter(
          (constraint) => constraint.date !== date
        ),
        excludedDoctorPeriods: currentState.excludedDoctorPeriods
      })
    );
    setSelectedStepTwoDates((currentDates) => currentDates.filter((entry) => entry !== date));
  }

  function setNewTemplateFormField(
    field: "code" | "label" | "allowedDoctorGroupId",
    value: string
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setNewTemplateForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function createStepTwoTemplate() {
    if (!user || role !== "ADMIN") {
      return null;
    }

    if (!newTemplateForm.code.trim()) {
      setErrorMessage("Template code is required.");
      return null;
    }

    if (!newTemplateForm.label.trim()) {
      setErrorMessage("Template label is required.");
      return null;
    }

    if (!newTemplateForm.allowedDoctorGroupId) {
      setErrorMessage("Choose the allowed doctor group for the template.");
      return null;
    }

    setActiveAction("create-template");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const createdTemplate =
        await groupConstraintTemplateManagementService.createGroupConstraintTemplate({
          code: newTemplateForm.code,
          label: newTemplateForm.label,
          allowedDoctorGroupId: newTemplateForm.allowedDoctorGroupId,
          actorId: user.id,
          actorRole: role
        });
      await loadStepTwoReferenceData();
      setSelectedStepTwoTemplateId(createdTemplate.id);
      setNewTemplateForm(createInitialTemplateForm());
      setSuccessMessage(`Created group constraint template '${createdTemplate.code}'.`);
      return createdTemplate;
    } catch (error) {
      setErrorMessage(
        getAdminOperationErrorMessage(error, "Unable to create group constraint template.")
      );
      return null;
    } finally {
      setActiveAction(null);
    }
  }

  function setExclusionFormField(
    field: "doctorId" | "startDate" | "endDate" | "reason",
    value: string
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setExclusionForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function addStepTwoExclusion() {
    if (!exclusionForm.doctorId) {
      setErrorMessage("Choose a doctor before adding an exclusion.");
      return;
    }

    if (!exclusionForm.startDate || !exclusionForm.endDate) {
      setErrorMessage("Choose both a start date and end date for the exclusion.");
      return;
    }

    if (exclusionForm.startDate > exclusionForm.endDate) {
      setErrorMessage("Exclusion end date must be on or after the start date.");
      return;
    }

    const currentRange = getCurrentStepOneViewRange();
    if (
      !isDateWithinRosterWizardRange(exclusionForm.startDate as ISODateString, currentRange) ||
      !isDateWithinRosterWizardRange(exclusionForm.endDate as ISODateString, currentRange)
    ) {
      setErrorMessage("Doctor exclusions must stay inside the current Step 1 range.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setStepTwoState((currentState) =>
      buildRosterWizardStepTwoState({
        groupConstraints: currentState.groupConstraints,
        excludedDoctorPeriods: [
          ...currentState.excludedDoctorPeriods,
          {
            id: crypto.randomUUID(),
            doctorId: exclusionForm.doctorId,
            startDate: exclusionForm.startDate as ISODateString,
            endDate: exclusionForm.endDate as ISODateString,
            reason: exclusionForm.reason.trim() || undefined
          }
        ]
      })
    );
    setExclusionForm(createInitialExclusionForm(currentRange));
  }

  function removeStepTwoExclusion(id: EntityId) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStepTwoState((currentState) =>
      buildRosterWizardStepTwoState({
        groupConstraints: currentState.groupConstraints,
        excludedDoctorPeriods: currentState.excludedDoctorPeriods.filter(
          (period) => period.id !== id
        )
      })
    );
  }

  function setStepThreeSelectedDutyDesignId(value: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedStepThreeDutyDesignId(value);
  }

  function setStepThreeMode(value: "standard" | "holiday-override") {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStepThreeAssignmentMode(value);
  }

  function toggleStepThreeDateSelection(date: ISODateString) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isDateWithinRosterWizardRange(date, getCurrentStepOneViewRange())) {
      return;
    }

    setSelectedStepThreeDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((entry) => entry !== date)
        : [...currentDates, date].sort()
    );
  }

  function clearStepThreeDateSelection() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedStepThreeDates([]);
  }

  function applyStepThreeAssignmentToSelectedDates() {
    if (!selectedStepThreeDutyDesignId) {
      setErrorMessage("Choose a duty design before assigning dates.");
      return;
    }

    if (selectedStepThreeDates.length === 0) {
      setErrorMessage("Select at least one date before assigning a duty design.");
      return;
    }

    const selectedDutyDesign = dutyDesigns.find(
      (dutyDesign) => dutyDesign.id === selectedStepThreeDutyDesignId
    );

    if (!selectedDutyDesign) {
      setErrorMessage("The selected duty design was not found.");
      return;
    }

    if (!selectedDutyDesign.isActive) {
      setErrorMessage(
        `Duty design '${selectedDutyDesign.label}' is inactive and cannot be assigned.`
      );
      return;
    }

    if (stepThreeAssignmentMode === "holiday-override") {
      const invalidDate = selectedStepThreeDates.find(
        (date) => !stepOneState.publicHolidayDates.includes(date)
      );

      if (invalidDate) {
        setErrorMessage(
          `Holiday override duty designs can only be applied to Step 1 holidays. ${invalidDate} is not marked as a holiday.`
        );
        return;
      }
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    const timestamp = new Date().toISOString();

    setStepThreeState((currentState) => {
      const nextAssignmentsByKey = new Map<string, (typeof currentState.dutyDesignAssignments)[number]>(
        currentState.dutyDesignAssignments.map((assignment) => [
          `${assignment.date}:${assignment.isHolidayOverride ? "holiday" : "standard"}`,
          assignment
        ] as const)
      );

      selectedStepThreeDates.forEach((date) => {
        const isHolidayOverride = stepThreeAssignmentMode === "holiday-override";
        const key = `${date}:${isHolidayOverride ? "holiday" : "standard"}`;
        const existingAssignment = nextAssignmentsByKey.get(key);

        nextAssignmentsByKey.set(key, {
          id: existingAssignment?.id ?? crypto.randomUUID(),
          date,
          dutyDesignId: selectedStepThreeDutyDesignId,
          isHolidayOverride,
          createdAt: existingAssignment?.createdAt ?? timestamp,
          updatedAt: timestamp
        });
      });

      return buildRosterWizardStepThreeState({
        dutyDesignAssignments: Array.from(nextAssignmentsByKey.values())
      });
    });
    setSelectedStepThreeDates([]);
  }

  function clearStepThreeAssignment(
    date: ISODateString,
    mode: "standard" | "holiday-override"
  ) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStepThreeState((currentState) =>
      buildRosterWizardStepThreeState({
        dutyDesignAssignments: currentState.dutyDesignAssignments.filter(
          (assignment) =>
            !(
              assignment.date === date &&
              assignment.isHolidayOverride === (mode === "holiday-override")
            )
        )
      })
    );
  }

  const stepOneValidationMessage = getRosterWizardStepOneValidationMessage(stepOneState);

  return {
    selectedMonth,
    setSelectedMonth: setSelectedMonth as (value: YearMonthString) => void,
    drafts,
    isLoading,
    activeAction,
    errorMessage,
    successMessage,
    activeDraft,
    activeDraftId: activeDraft?.id ?? null,
    draftName,
    stepOneState,
    stepTwoState,
    stepThreeState,
    stepFourPreview,
    stepFiveReview,
    selectedShiftId,
    selectedShiftDetails,
    groupConstraintTemplates,
    doctorGroups,
    doctors,
    dutyDesigns,
    isLoadingStepTwoReferenceData,
    isLoadingStepThreeReferenceData,
    isLoadingStepFourPreview,
    isLoadingStepFourShiftDetails,
    isLoadingStepFiveReview,
    selectedStepTwoTemplateId,
    selectedStepTwoDates,
    selectedStepThreeDutyDesignId,
    stepThreeAssignmentMode,
    selectedStepThreeDates,
    newTemplateForm,
    exclusionForm,
    stepOneEffectiveRange: getCurrentStepOneViewRange(),
    canProceedToNextStep: stepOneValidationMessage === null,
    isDialogOpen,
    setDraftName,
    setStepOneRosterMonth,
    setStepOneRangeMode,
    setStepOneCustomRangeField,
    toggleStepOneHoliday,
    clearStepOneHolidays,
    setStepTwoSelectedTemplateId,
    toggleStepTwoDateSelection,
    clearStepTwoDateSelection,
    applyStepTwoTemplateToSelectedDates,
    clearStepTwoGroupConstraint,
    setNewTemplateFormField,
    createStepTwoTemplate,
    setExclusionFormField,
    addStepTwoExclusion,
    removeStepTwoExclusion,
    setStepThreeSelectedDutyDesignId,
    setStepThreeMode,
    toggleStepThreeDateSelection,
    clearStepThreeDateSelection,
    applyStepThreeAssignmentToSelectedDates,
    clearStepThreeAssignment,
    onStepFourOpenShift: openStepFourShift,
    onStepFourCloseShift: closeStepFourShift,
    onStepFourAssignDoctor: assignStepFourDoctor,
    createDraft,
    openDraft,
    closeDialog,
    goToStep,
    goToPreviousStep,
    goToNextStep,
    publishDraft,
    unlockDraft,
    deleteDraft,
    reloadDrafts: loadDrafts
  };
}
