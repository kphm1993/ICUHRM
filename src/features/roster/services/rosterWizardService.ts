import type {
  ActorRole,
  AllowedDoctorGroupIdByDate,
  BiasCriteria,
  BiasLedger,
  Doctor,
  DutyLocation,
  DutyDesign,
  EntityId,
  ISODateString,
  ManualShiftAssignment,
  RosterWizardDraft,
  RosterWizardStep,
  ShiftType,
  YearMonthString
} from "@/domain/models";
import type {
  DutyDesignRepository,
  DoctorRepository,
  GroupConstraintTemplateRepository,
  RosterWizardDraftRepository
} from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { simulateManualRosterAllocation } from "@/domain/scheduling/simulateManualRosterAllocation";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { BiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import type { DutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";
import { logRosterWizardDraftLifecycleEvent } from "@/features/audit/services/lifecycleAuditLogging";
import type { BiasManagementService } from "@/features/fairness/services/biasManagementService";
import type { LeaveManagementService } from "@/features/leaves/services/leaveManagementService";
import type { OffRequestService } from "@/features/offRequests/services/offRequestService";
import {
  listRosterWizardMonthsInRange,
  validateRosterWizardStepOneDraft
} from "@/features/roster/lib/rosterWizardStepOne";
import { validateRosterWizardStepTwoDraft } from "@/features/roster/lib/rosterWizardStepTwo";
import { validateRosterWizardStepThreeDraft } from "@/features/roster/lib/rosterWizardStepThree";
import type { ShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";

type RosterWizardDraftChanges = Partial<
  Omit<
    RosterWizardDraft,
    "id" | "createdByActorId" | "createdAt" | "updatedAt" | "status" | "currentStep"
  >
>;

export interface CreateRosterWizardDraftInput {
  readonly rosterMonth: YearMonthString;
  readonly name?: string;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface SaveRosterWizardDraftStepInput {
  readonly draftId: EntityId;
  readonly currentStep: RosterWizardStep;
  readonly changes?: RosterWizardDraftChanges;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface LoadRosterWizardDraftInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface ListRosterWizardDraftsInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
  readonly rosterMonth?: YearMonthString;
  readonly statuses?: ReadonlyArray<RosterWizardDraft["status"]>;
}

export interface UpdateRosterWizardDraftStatusInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface DeleteRosterWizardDraftInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface RosterWizardStepFourShiftPreview {
  readonly shiftId: EntityId;
  readonly date: ISODateString;
  readonly shiftTypeId: EntityId;
  readonly shiftTypeLabel: string;
  readonly locationId: EntityId;
  readonly locationLabel: string;
  readonly slotLabel?: string;
  readonly source: "DUTY_DESIGN_STANDARD" | "DUTY_DESIGN_HOLIDAY_OVERRIDE" | "LEGACY_FALLBACK";
  readonly assignedDoctorId?: EntityId;
  readonly assignedDoctorName?: string;
  readonly assignedDoctorUniqueIdentifier?: string;
  readonly overallRecommendedDoctorId?: EntityId;
  readonly assignmentStatus: "UNASSIGNED" | "ASSIGNED" | "INVALID";
  readonly invalidReasons: ReadonlyArray<string>;
}

export interface RosterWizardStepFourDayPreview {
  readonly date: ISODateString;
  readonly isHoliday: boolean;
  readonly allowedDoctorGroupId?: EntityId;
  readonly excludedDoctorCount: number;
  readonly totalSlotCount: number;
  readonly assignedSlotCount: number;
  readonly invalidSlotCount: number;
  readonly shifts: ReadonlyArray<RosterWizardStepFourShiftPreview>;
}

export interface RosterWizardStepFourPreview {
  readonly effectiveRange: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly days: ReadonlyArray<RosterWizardStepFourDayPreview>;
  readonly totalSlotCount: number;
  readonly assignedSlotCount: number;
  readonly unassignedSlotCount: number;
  readonly invalidSlotCount: number;
  readonly warnings: ReadonlyArray<string>;
  readonly currentBiasSnapshot: ReadonlyArray<BiasLedger>;
}

export interface RosterWizardStepFourDoctorCandidate {
  readonly doctorId: EntityId;
  readonly doctorName: string;
  readonly doctorUniqueIdentifier: string;
  readonly groupId?: EntityId;
  readonly isEligible: boolean;
  readonly reasons: ReadonlyArray<string>;
  readonly biasValue: number;
  readonly overallScore?: number;
  readonly isAssigned: boolean;
  readonly isOverallRecommended: boolean;
}

export interface RosterWizardStepFourCriteriaTab {
  readonly id: string;
  readonly label: string;
  readonly criteriaId?: EntityId;
  readonly doctors: ReadonlyArray<RosterWizardStepFourDoctorCandidate>;
}

export interface RosterWizardStepFourShiftDetails {
  readonly shift: RosterWizardStepFourShiftPreview;
  readonly currentAssignmentDoctorId?: EntityId;
  readonly currentAssignmentWarning: string | null;
  readonly currentAssignmentInvalidReasons: ReadonlyArray<string>;
  readonly overallRecommendedDoctorId?: EntityId;
  readonly overallRecommendedDoctorName?: string;
  readonly tabs: ReadonlyArray<RosterWizardStepFourCriteriaTab>;
}

export interface RosterWizardStepFiveSummary {
  readonly totalSlotCount: number;
  readonly assignedSlotCount: number;
  readonly unassignedSlotCount: number;
  readonly invalidAssignmentCount: number;
  readonly holidayCount: number;
  readonly constrainedDateCount: number;
  readonly exclusionPeriodCount: number;
}

export interface RosterWizardStepFiveDoctorWorkloadRow {
  readonly doctorId: EntityId;
  readonly doctorName: string;
  readonly doctorUniqueIdentifier: string;
  readonly doctorGroupId?: EntityId;
  readonly totalAssignedSlotCount: number;
  readonly daySlotCount: number;
  readonly nightSlotCount: number;
  readonly holidayAssignmentCount: number;
  readonly constrainedDateAssignmentCount: number;
}

export interface RosterWizardStepFiveBiasSummaryColumn {
  readonly criteriaId: EntityId;
  readonly code: string;
  readonly label: string;
}

export interface RosterWizardStepFiveBiasSummaryRow {
  readonly doctorId: EntityId;
  readonly doctorName: string;
  readonly doctorUniqueIdentifier: string;
  readonly doctorGroupId?: EntityId;
  readonly valuesByCriteriaId: Readonly<Record<EntityId, number>>;
}

export interface RosterWizardStepFiveHolidayCoverageRow {
  readonly date: ISODateString;
  readonly totalSlotCount: number;
  readonly assignedSlotCount: number;
  readonly mappingState:
    | "LEGACY_FALLBACK"
    | "STANDARD_ONLY"
    | "HOLIDAY_OVERRIDE_ONLY"
    | "STANDARD_AND_HOLIDAY_OVERRIDE";
  readonly standardDutyDesignId?: EntityId;
  readonly standardDutyDesignLabel?: string;
  readonly holidayOverrideDutyDesignId?: EntityId;
  readonly holidayOverrideDutyDesignLabel?: string;
}

export interface RosterWizardStepFiveGroupConstraintImpactRow {
  readonly date: ISODateString;
  readonly allowedDoctorGroupId: EntityId;
  readonly excludedDoctorCount: number;
  readonly totalSlotCount: number;
  readonly assignedSlotCount: number;
}

export interface RosterWizardStepFiveInvalidAssignmentRow {
  readonly shiftId: EntityId;
  readonly date: ISODateString;
  readonly shiftTypeLabel: string;
  readonly locationLabel: string;
  readonly slotLabel?: string;
  readonly source: RosterWizardStepFourShiftPreview["source"];
  readonly assignedDoctorName?: string;
  readonly invalidReasons: ReadonlyArray<string>;
}

export interface RosterWizardStepFivePublishReadiness {
  readonly canPublish: boolean;
  readonly blockingReasons: ReadonlyArray<string>;
}

export interface RosterWizardStepFiveReview {
  readonly summary: RosterWizardStepFiveSummary;
  readonly doctorWorkloadRows: ReadonlyArray<RosterWizardStepFiveDoctorWorkloadRow>;
  readonly biasSummaryColumns: ReadonlyArray<RosterWizardStepFiveBiasSummaryColumn>;
  readonly biasSummaryRows: ReadonlyArray<RosterWizardStepFiveBiasSummaryRow>;
  readonly holidayCoverageRows: ReadonlyArray<RosterWizardStepFiveHolidayCoverageRow>;
  readonly groupConstraintImpactRows: ReadonlyArray<RosterWizardStepFiveGroupConstraintImpactRow>;
  readonly invalidAssignmentRows: ReadonlyArray<RosterWizardStepFiveInvalidAssignmentRow>;
  readonly publishReadiness: RosterWizardStepFivePublishReadiness;
  readonly warnings: ReadonlyArray<string>;
}

export interface LoadRosterWizardStepFourInput {
  readonly draftId: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface LoadRosterWizardStepFourShiftDetailsInput
  extends LoadRosterWizardStepFourInput {
  readonly shiftId: EntityId;
}

export interface SetRosterWizardManualShiftAssignmentInput
  extends LoadRosterWizardStepFourShiftDetailsInput {
  readonly doctorId: EntityId | null;
}

export interface RosterWizardService {
  createDraft(input: CreateRosterWizardDraftInput): Promise<RosterWizardDraft>;
  saveDraftStep(input: SaveRosterWizardDraftStepInput): Promise<RosterWizardDraft>;
  loadDraftById(input: LoadRosterWizardDraftInput): Promise<RosterWizardDraft>;
  listDraftsByAdmin(
    input: ListRosterWizardDraftsInput
  ): Promise<ReadonlyArray<RosterWizardDraft>>;
  loadStepFourPreview(
    input: LoadRosterWizardStepFourInput
  ): Promise<RosterWizardStepFourPreview>;
  loadStepFourShiftDetails(
    input: LoadRosterWizardStepFourShiftDetailsInput
  ): Promise<RosterWizardStepFourShiftDetails>;
  loadStepFiveReview(
    input: LoadRosterWizardStepFourInput
  ): Promise<RosterWizardStepFiveReview>;
  setManualShiftAssignment(
    input: SetRosterWizardManualShiftAssignmentInput
  ): Promise<{
    readonly draft: RosterWizardDraft;
    readonly preview: RosterWizardStepFourPreview;
  }>;
  publishDraft(
    input: UpdateRosterWizardDraftStatusInput
  ): Promise<RosterWizardDraft>;
  lockDraft(input: UpdateRosterWizardDraftStatusInput): Promise<RosterWizardDraft>;
  unlockDraft(
    input: UpdateRosterWizardDraftStatusInput
  ): Promise<RosterWizardDraft>;
  deleteDraft(input: DeleteRosterWizardDraftInput): Promise<void>;
}

export interface RosterWizardServiceDependencies {
  readonly rosterWizardDraftRepository: RosterWizardDraftRepository;
  readonly doctorRepository: DoctorRepository;
  readonly groupConstraintTemplateRepository: GroupConstraintTemplateRepository;
  readonly dutyDesignRepository: DutyDesignRepository;
  readonly biasCriteriaManagementService: BiasCriteriaManagementService;
  readonly dutyLocationManagementService: DutyLocationManagementService;
  readonly shiftTypeManagementService: ShiftTypeManagementService;
  readonly leaveManagementService: LeaveManagementService;
  readonly offRequestService: OffRequestService;
  readonly biasManagementService: BiasManagementService;
  readonly auditLogService: AuditLogService;
}

type SimulatedManualShiftState =
  ReturnType<typeof simulateManualRosterAllocation>["shiftStatesById"] extends ReadonlyMap<
    EntityId,
    infer TValue
  >
    ? TValue
    : never;

function cloneBiasLedger(entry: BiasLedger): BiasLedger {
  return {
    ...entry,
    balances: { ...entry.balances }
  };
}

function cloneDraft(draft: RosterWizardDraft): RosterWizardDraft {
  return {
    ...draft,
    customRange: draft.customRange ? { ...draft.customRange } : undefined,
    publicHolidayDates: [...draft.publicHolidayDates],
    groupConstraintTemplateIds: [...draft.groupConstraintTemplateIds],
    groupConstraints: draft.groupConstraints.map((constraint) => ({ ...constraint })),
    excludedDoctorPeriods: draft.excludedDoctorPeriods.map((period) => ({ ...period })),
    dutyDesignAssignments: draft.dutyDesignAssignments.map((assignment) => ({
      ...assignment
    })),
    manualShiftAssignments: draft.manualShiftAssignments.map((assignment) => ({
      ...assignment
    })),
    baseBiasSnapshot: draft.baseBiasSnapshot.map(cloneBiasLedger),
    currentBiasSnapshot: draft.currentBiasSnapshot.map(cloneBiasLedger)
  };
}

function normalizeDraftName(name: string): string {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Draft name is required.");
  }

  return normalizedName;
}

function buildDefaultDraftName(rosterMonth: YearMonthString): string {
  return `Roster Wizard ${rosterMonth}`;
}

function ensureStep(step: RosterWizardStep): RosterWizardStep {
  if (step === 1 || step === 2 || step === 3 || step === 4 || step === 5) {
    return step;
  }

  throw new Error("Roster wizard step is invalid.");
}

interface RosterWizardGenerationSourceData {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly leaves: Awaited<ReturnType<LeaveManagementService["listLeaves"]>>;
  readonly offRequests: Awaited<ReturnType<OffRequestService["listRequests"]>>;
  readonly fallbackLocationId: EntityId;
}

function indexEntriesById<T extends { readonly id: EntityId }>(
  entries: ReadonlyArray<T>
): Readonly<Record<EntityId, T>> {
  return entries.reduce<Record<EntityId, T>>((result, entry) => {
    result[entry.id] = entry;
    return result;
  }, {});
}

function cloneManualShiftAssignments(
  assignments: ReadonlyArray<ManualShiftAssignment>
): ReadonlyArray<ManualShiftAssignment> {
  return assignments.map((assignment) => ({ ...assignment }));
}

function resolveFallbackLocationId(
  activeDutyLocations: ReadonlyArray<DutyLocation>
): EntityId {
  const fallbackLocation = activeDutyLocations.find(
    (location) => location.id === DEFAULT_DUTY_LOCATION_ID
  );

  if (!fallbackLocation) {
    throw new Error(
      `Roster wizard Step 4 requires the default duty location '${DEFAULT_DUTY_LOCATION_ID}' to be active.`
    );
  }

  return fallbackLocation.id;
}

async function loadRosterWizardGenerationSourceData(
  dependencies: Pick<
    RosterWizardServiceDependencies,
    | "doctorRepository"
    | "biasCriteriaManagementService"
    | "dutyLocationManagementService"
    | "shiftTypeManagementService"
    | "leaveManagementService"
    | "offRequestService"
  >,
  input: {
    readonly rosterMonth: YearMonthString;
    readonly effectiveRange: {
      readonly startDate: ISODateString;
      readonly endDate: ISODateString;
    };
  }
): Promise<RosterWizardGenerationSourceData> {
  const touchedMonths = listRosterWizardMonthsInRange(input.effectiveRange);
  const [doctors, criteria, dutyLocations, shiftTypes, leaves, offRequestsByMonth] =
    await Promise.all([
      dependencies.doctorRepository.list(),
      dependencies.biasCriteriaManagementService.getCriteriaList(),
      dependencies.dutyLocationManagementService.getLocationList(),
      dependencies.shiftTypeManagementService.listShiftTypes({ isActive: true }),
      dependencies.leaveManagementService.listLeaves(
        input.effectiveRange.startDate,
        input.effectiveRange.endDate
      ),
      Promise.all(
        touchedMonths.map((month) => dependencies.offRequestService.listRequests(month))
      )
    ]);
  const activeBiasCriteria = criteria.filter((entry) => entry.isActive);
  const activeDutyLocations = dutyLocations.filter((location) => location.isActive);

  return {
    doctors,
    activeBiasCriteria,
    activeDutyLocations,
    shiftTypes,
    leaves,
    offRequests: offRequestsByMonth
      .flat()
      .filter(
        (request) =>
          request.date >= input.effectiveRange.startDate &&
          request.date <= input.effectiveRange.endDate
      ),
    fallbackLocationId: resolveFallbackLocationId(activeDutyLocations)
  };
}

function sortCriteriaBySpecificity(
  criteria: ReadonlyArray<BiasCriteria>
): ReadonlyArray<BiasCriteria> {
  return [...criteria].sort((left, right) => {
    const leftScore =
      (left.locationIds.length > 0 ? 8 : 0) +
      (left.weekdayConditions.length > 0 ? 4 : left.isWeekendOnly ? 2 : 0) +
      (left.shiftTypeIds.length > 0 ? 2 : 0);
    const rightScore =
      (right.locationIds.length > 0 ? 8 : 0) +
      (right.weekdayConditions.length > 0 ? 4 : right.isWeekendOnly ? 2 : 0) +
      (right.shiftTypeIds.length > 0 ? 2 : 0);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const labelComparison = left.label.localeCompare(right.label);
    return labelComparison !== 0 ? labelComparison : left.id.localeCompare(right.id);
  });
}

function readBiasValue(
  ledgers: ReadonlyArray<BiasLedger>,
  doctorId: EntityId,
  criteriaId?: EntityId
): number {
  if (!criteriaId) {
    return 0;
  }

  return (
    ledgers.find((ledger) => ledger.doctorId === doctorId)?.balances[criteriaId] ?? 0
  );
}

function mapShiftStateToPreview(
  shiftState: SimulatedManualShiftState,
  doctorsById: Readonly<Record<EntityId, Doctor>>,
  locationsById: Readonly<Record<EntityId, DutyLocation>>
): RosterWizardStepFourShiftPreview {
  const assignedDoctorId =
    shiftState.selectedManualAssignment?.doctorId ?? shiftState.selectedDoctor?.id;
  const assignedDoctor =
    assignedDoctorId !== undefined ? doctorsById[assignedDoctorId] : undefined;
  const locationLabel =
    locationsById[shiftState.shift.locationId]?.label ??
    shiftState.shift.definitionSnapshot.locationId;

  return {
    shiftId: shiftState.shift.id,
    date: shiftState.shift.date,
    shiftTypeId: shiftState.shift.shiftTypeId,
    shiftTypeLabel: shiftState.shift.definitionSnapshot.label,
    locationId: shiftState.shift.locationId,
    locationLabel,
    slotLabel:
      shiftState.shiftMetadata?.slotIndex !== undefined
        ? `Slot ${shiftState.shiftMetadata.slotIndex + 1}`
        : undefined,
    source: shiftState.shiftMetadata?.source ?? "LEGACY_FALLBACK",
    assignedDoctorId,
    assignedDoctorName:
      assignedDoctor?.name ??
      (shiftState.selectedManualAssignment
        ? `Unknown doctor (${shiftState.selectedManualAssignment.doctorId})`
        : undefined),
    assignedDoctorUniqueIdentifier: assignedDoctor?.uniqueIdentifier,
    overallRecommendedDoctorId: shiftState.overallRecommendedDoctorId,
    assignmentStatus: shiftState.assignmentStatus,
    invalidReasons: [...shiftState.invalidReasons]
  };
}

function buildStepFourPreview(input: {
  readonly effectiveRange: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly excludedDoctorsByDate: ReadonlyMap<ISODateString, ReadonlySet<EntityId>>;
  readonly currentBiasSnapshot: ReadonlyArray<BiasLedger>;
  readonly warnings: ReadonlyArray<string>;
  readonly shiftStatesById: ReturnType<typeof simulateManualRosterAllocation>["shiftStatesById"];
  readonly doctors: ReadonlyArray<Doctor>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
}): RosterWizardStepFourPreview {
  const doctorsById = indexEntriesById(input.doctors);
  const locationsById = indexEntriesById(input.activeDutyLocations);
  const daysByDate = new Map<ISODateString, RosterWizardStepFourDayPreview>();

  Array.from(input.shiftStatesById.values()).forEach((shiftState) => {
    const preview = mapShiftStateToPreview(shiftState, doctorsById, locationsById);
    const existingDay = daysByDate.get(shiftState.shift.date) ?? {
      date: shiftState.shift.date,
      isHoliday: input.publicHolidayDates.includes(shiftState.shift.date),
      allowedDoctorGroupId: input.allowedDoctorGroupIdByDate[shiftState.shift.date],
      excludedDoctorCount:
        input.excludedDoctorsByDate.get(shiftState.shift.date)?.size ?? 0,
      totalSlotCount: 0,
      assignedSlotCount: 0,
      invalidSlotCount: 0,
      shifts: []
    };
    const shifts = [...existingDay.shifts, preview];

    daysByDate.set(shiftState.shift.date, {
      ...existingDay,
      totalSlotCount: existingDay.totalSlotCount + 1,
      assignedSlotCount:
        existingDay.assignedSlotCount + (preview.assignmentStatus === "ASSIGNED" ? 1 : 0),
      invalidSlotCount:
        existingDay.invalidSlotCount + (preview.assignmentStatus === "INVALID" ? 1 : 0),
      shifts
    });
  });

  const days = Array.from(daysByDate.values()).sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const totalSlotCount = days.reduce((sum, day) => sum + day.totalSlotCount, 0);
  const assignedSlotCount = days.reduce((sum, day) => sum + day.assignedSlotCount, 0);
  const invalidSlotCount = days.reduce((sum, day) => sum + day.invalidSlotCount, 0);

  return {
    effectiveRange: {
      startDate: input.effectiveRange.startDate,
      endDate: input.effectiveRange.endDate
    },
    days,
    totalSlotCount,
    assignedSlotCount,
    unassignedSlotCount: totalSlotCount - assignedSlotCount - invalidSlotCount,
    invalidSlotCount,
    warnings: [...input.warnings],
    currentBiasSnapshot: input.currentBiasSnapshot.map(cloneBiasLedger)
  };
}

function buildStepFourShiftDetails(input: {
  readonly shiftId: EntityId;
  readonly simulation: ReturnType<typeof simulateManualRosterAllocation>;
  readonly preview: RosterWizardStepFourPreview;
  readonly doctors: ReadonlyArray<Doctor>;
}): RosterWizardStepFourShiftDetails {
  const shiftState = input.simulation.shiftStatesById.get(input.shiftId);

  if (!shiftState) {
    throw new RepositoryNotFoundError(`Wizard shift '${input.shiftId}' was not found.`);
  }

  const doctorsById = indexEntriesById(input.doctors);
  const previewShift = input.preview.days
    .flatMap((day) => day.shifts)
    .find((shift) => shift.shiftId === input.shiftId);

  if (!previewShift) {
    throw new RepositoryNotFoundError(`Wizard shift '${input.shiftId}' was not found.`);
  }

  const overallRecommendation = shiftState.overallRecommendedDoctorId
    ? doctorsById[shiftState.overallRecommendedDoctorId]
    : undefined;
  const currentAssignmentWarning =
    previewShift.assignmentStatus === "ASSIGNED" &&
    previewShift.assignedDoctorId &&
    previewShift.overallRecommendedDoctorId &&
    previewShift.assignedDoctorId !== previewShift.overallRecommendedDoctorId
      ? `${previewShift.assignedDoctorName ?? "The selected doctor"} is not the current top-ranked eligible candidate for this shift.`
      : null;
  const sortedMatchingCriteria = sortCriteriaBySpecificity(shiftState.matchingCriteria);
  const tabs =
    sortedMatchingCriteria.length === 0
      ? [
          {
            id: "overall-ranking",
            label: "Overall ranking",
            criteriaId: undefined,
            doctors: input.doctors
              .map((doctor) => {
                const decision = shiftState.eligibility.find(
                  (entry) => entry.doctorId === doctor.id
                );
                const candidateScore = shiftState.candidateScores.find(
                  (entry) => entry.doctorId === doctor.id
                );

                return {
                  doctorId: doctor.id,
                  doctorName: doctor.name,
                  doctorUniqueIdentifier: doctor.uniqueIdentifier,
                  groupId: doctor.groupId,
                  isEligible: decision?.isEligible ?? false,
                  reasons: [...(decision?.reasons ?? [])],
                  biasValue: 0,
                  overallScore: candidateScore?.totalScore,
                  isAssigned: previewShift.assignedDoctorId === doctor.id,
                  isOverallRecommended: previewShift.overallRecommendedDoctorId === doctor.id
                };
              })
              .sort((left, right) => {
                if (left.isEligible !== right.isEligible) {
                  return left.isEligible ? -1 : 1;
                }

                if (
                  left.overallScore !== undefined &&
                  right.overallScore !== undefined &&
                  left.overallScore !== right.overallScore
                ) {
                  return left.overallScore - right.overallScore;
                }

                const nameComparison = left.doctorName.localeCompare(right.doctorName);
                return nameComparison !== 0
                  ? nameComparison
                  : left.doctorId.localeCompare(right.doctorId);
              })
          }
        ]
      : sortedMatchingCriteria.map((criteria) => ({
          id: criteria.id,
          label: criteria.label,
          criteriaId: criteria.id,
          doctors: input.doctors
            .map((doctor) => {
              const decision = shiftState.eligibility.find(
                (entry) => entry.doctorId === doctor.id
              );
              const overallScore = shiftState.candidateScores.find(
                (entry) => entry.doctorId === doctor.id
              )?.totalScore;

              return {
                doctorId: doctor.id,
                doctorName: doctor.name,
                doctorUniqueIdentifier: doctor.uniqueIdentifier,
                groupId: doctor.groupId,
                isEligible: decision?.isEligible ?? false,
                reasons: [...(decision?.reasons ?? [])],
                biasValue: readBiasValue(
                  input.preview.currentBiasSnapshot,
                  doctor.id,
                  criteria.id
                ),
                overallScore,
                isAssigned: previewShift.assignedDoctorId === doctor.id,
                isOverallRecommended: previewShift.overallRecommendedDoctorId === doctor.id
              };
            })
            .sort((left, right) => {
              if (left.isEligible !== right.isEligible) {
                return left.isEligible ? -1 : 1;
              }

              if (left.biasValue !== right.biasValue) {
                return left.biasValue - right.biasValue;
              }

              const nameComparison = left.doctorName.localeCompare(right.doctorName);
              return nameComparison !== 0
                ? nameComparison
                : left.doctorId.localeCompare(right.doctorId);
            })
        }));

  return {
    shift: previewShift,
    currentAssignmentDoctorId: previewShift.assignedDoctorId,
    currentAssignmentWarning,
    currentAssignmentInvalidReasons: [...previewShift.invalidReasons],
    overallRecommendedDoctorId: previewShift.overallRecommendedDoctorId,
    overallRecommendedDoctorName: overallRecommendation?.name,
    tabs
  };
}

function compareDoctorsByName(left: Doctor, right: Doctor): number {
  const nameComparison = left.name.localeCompare(right.name);
  return nameComparison !== 0 ? nameComparison : left.id.localeCompare(right.id);
}

function compareBiasCriteriaByLabel(left: BiasCriteria, right: BiasCriteria): number {
  const labelComparison = left.label.localeCompare(right.label);
  return labelComparison !== 0 ? labelComparison : left.id.localeCompare(right.id);
}

function resolveDutyDesignLabel(
  dutyDesignId: EntityId,
  dutyDesignsById: Readonly<Record<EntityId, DutyDesign>>
): string {
  const dutyDesign = dutyDesignsById[dutyDesignId];

  if (!dutyDesign) {
    return `Unknown duty design (${dutyDesignId})`;
  }

  return dutyDesign.isActive
    ? dutyDesign.label
    : `${dutyDesign.label} (inactive)`;
}

function buildPublishBlockingReasons(input: {
  readonly unassignedSlotCount: number;
  readonly invalidAssignmentCount: number;
}): ReadonlyArray<string> {
  const blockingReasons: string[] = [];

  if (input.unassignedSlotCount > 0) {
    blockingReasons.push(
      `${input.unassignedSlotCount} shift slot${
        input.unassignedSlotCount === 1 ? "" : "s"
      } remain unassigned.`
    );
  }

  if (input.invalidAssignmentCount > 0) {
    blockingReasons.push(
      `${input.invalidAssignmentCount} saved assignment${
        input.invalidAssignmentCount === 1 ? " is" : "s are"
      } invalid and must be fixed before publishing.`
    );
  }

  return blockingReasons;
}

function buildStepFiveReview(input: {
  readonly validatedStepOneDraft: Awaited<ReturnType<typeof loadStepFourContext>>["validatedStepOneDraft"];
  readonly validatedStepTwoDraft: Awaited<ReturnType<typeof loadStepFourContext>>["validatedStepTwoDraft"];
  readonly validatedStepThreeDraft: Awaited<ReturnType<typeof loadStepFourContext>>["validatedStepThreeDraft"];
  readonly sourceData: Awaited<ReturnType<typeof loadStepFourContext>>["sourceData"];
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly simulation: ReturnType<typeof simulateManualRosterAllocation>;
  readonly preview: RosterWizardStepFourPreview;
}): RosterWizardStepFiveReview {
  const dayPreviewByDate = new Map(
    input.preview.days.map((day) => [day.date, day] as const)
  );
  const dutyDesignsById = indexEntriesById(input.dutyDesigns);
  const constrainedDates = new Set(
    Object.keys(input.validatedStepTwoDraft.allowedDoctorGroupIdByDate)
  );
  const holidayDates = new Set(input.validatedStepOneDraft.publicHolidayDates);
  const doctorWorkload = new Map<
    EntityId,
    Omit<RosterWizardStepFiveDoctorWorkloadRow, "doctorId" | "doctorName" | "doctorUniqueIdentifier" | "doctorGroupId">
  >();

  input.simulation.acceptedAssignments.forEach((assignment) => {
    const shiftState = input.simulation.shiftStatesById.get(assignment.shiftId);

    if (!shiftState) {
      return;
    }

    const currentTotals = doctorWorkload.get(assignment.assignedDoctorId) ?? {
      totalAssignedSlotCount: 0,
      daySlotCount: 0,
      nightSlotCount: 0,
      holidayAssignmentCount: 0,
      constrainedDateAssignmentCount: 0
    };

    doctorWorkload.set(assignment.assignedDoctorId, {
      totalAssignedSlotCount: currentTotals.totalAssignedSlotCount + 1,
      daySlotCount:
        currentTotals.daySlotCount + (shiftState.shift.type === "DAY" ? 1 : 0),
      nightSlotCount:
        currentTotals.nightSlotCount + (shiftState.shift.type === "NIGHT" ? 1 : 0),
      holidayAssignmentCount:
        currentTotals.holidayAssignmentCount +
        (holidayDates.has(shiftState.shift.date) ? 1 : 0),
      constrainedDateAssignmentCount:
        currentTotals.constrainedDateAssignmentCount +
        (constrainedDates.has(shiftState.shift.date) ? 1 : 0)
    });
  });

  const doctorWorkloadRows = [...input.sourceData.doctors]
    .sort(compareDoctorsByName)
    .map<RosterWizardStepFiveDoctorWorkloadRow>((doctor) => {
      const totals = doctorWorkload.get(doctor.id) ?? {
        totalAssignedSlotCount: 0,
        daySlotCount: 0,
        nightSlotCount: 0,
        holidayAssignmentCount: 0,
        constrainedDateAssignmentCount: 0
      };

      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorUniqueIdentifier: doctor.uniqueIdentifier,
        doctorGroupId: doctor.groupId,
        ...totals
      };
    });
  const biasSummaryColumns = [...input.sourceData.activeBiasCriteria]
    .sort(compareBiasCriteriaByLabel)
    .map<RosterWizardStepFiveBiasSummaryColumn>((criteria) => ({
      criteriaId: criteria.id,
      code: criteria.code,
      label: criteria.label
    }));
  const biasSummaryRows = [...input.sourceData.doctors]
    .sort(compareDoctorsByName)
    .map<RosterWizardStepFiveBiasSummaryRow>((doctor) => ({
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorUniqueIdentifier: doctor.uniqueIdentifier,
      doctorGroupId: doctor.groupId,
      valuesByCriteriaId: Object.fromEntries(
        biasSummaryColumns.map((criteria) => [
          criteria.criteriaId,
          readBiasValue(
            input.preview.currentBiasSnapshot,
            doctor.id,
            criteria.criteriaId
          )
        ])
      ) as Readonly<Record<EntityId, number>>
    }));
  const holidayCoverageRows = [...input.validatedStepOneDraft.publicHolidayDates].map(
    (date): RosterWizardStepFiveHolidayCoverageRow => {
      const dayPreview = dayPreviewByDate.get(date);
      const assignments = input.validatedStepThreeDraft.assignmentsByDate[date] ?? {};
      const hasStandardAssignment = assignments.standardAssignment !== undefined;
      const hasHolidayOverrideAssignment =
        assignments.holidayOverrideAssignment !== undefined;
      let mappingState: RosterWizardStepFiveHolidayCoverageRow["mappingState"] =
        "LEGACY_FALLBACK";

      if (hasStandardAssignment && hasHolidayOverrideAssignment) {
        mappingState = "STANDARD_AND_HOLIDAY_OVERRIDE";
      } else if (hasHolidayOverrideAssignment) {
        mappingState = "HOLIDAY_OVERRIDE_ONLY";
      } else if (hasStandardAssignment) {
        mappingState = "STANDARD_ONLY";
      }

      return {
        date,
        totalSlotCount: dayPreview?.totalSlotCount ?? 0,
        assignedSlotCount: dayPreview?.assignedSlotCount ?? 0,
        mappingState,
        standardDutyDesignId: assignments.standardAssignment?.dutyDesignId,
        standardDutyDesignLabel: assignments.standardAssignment
          ? resolveDutyDesignLabel(
              assignments.standardAssignment.dutyDesignId,
              dutyDesignsById
            )
          : undefined,
        holidayOverrideDutyDesignId: assignments.holidayOverrideAssignment?.dutyDesignId,
        holidayOverrideDutyDesignLabel: assignments.holidayOverrideAssignment
          ? resolveDutyDesignLabel(
              assignments.holidayOverrideAssignment.dutyDesignId,
              dutyDesignsById
            )
          : undefined
      };
    }
  );
  const groupConstraintImpactRows = input.validatedStepTwoDraft.groupConstraints.map(
    (constraint): RosterWizardStepFiveGroupConstraintImpactRow => {
      const dayPreview = dayPreviewByDate.get(constraint.date);

      return {
        date: constraint.date,
        allowedDoctorGroupId:
          input.validatedStepTwoDraft.allowedDoctorGroupIdByDate[constraint.date],
        excludedDoctorCount:
          input.validatedStepTwoDraft.excludedDoctorsByDate.get(constraint.date)?.size ??
          0,
        totalSlotCount: dayPreview?.totalSlotCount ?? 0,
        assignedSlotCount: dayPreview?.assignedSlotCount ?? 0
      };
    }
  );
  const invalidAssignmentRows = input.preview.days.flatMap((day) =>
    day.shifts
      .filter((shift) => shift.assignmentStatus === "INVALID")
      .map<RosterWizardStepFiveInvalidAssignmentRow>((shift) => ({
        shiftId: shift.shiftId,
        date: shift.date,
        shiftTypeLabel: shift.shiftTypeLabel,
        locationLabel: shift.locationLabel,
        slotLabel: shift.slotLabel,
        source: shift.source,
        assignedDoctorName: shift.assignedDoctorName,
        invalidReasons: [...shift.invalidReasons]
      }))
  );
  const summary: RosterWizardStepFiveSummary = {
    totalSlotCount: input.preview.totalSlotCount,
    assignedSlotCount: input.preview.assignedSlotCount,
    unassignedSlotCount: input.preview.unassignedSlotCount,
    invalidAssignmentCount: input.preview.invalidSlotCount,
    holidayCount: input.validatedStepOneDraft.publicHolidayDates.length,
    constrainedDateCount: input.validatedStepTwoDraft.groupConstraints.length,
    exclusionPeriodCount: input.validatedStepTwoDraft.excludedDoctorPeriods.length
  };
  const publishReadiness: RosterWizardStepFivePublishReadiness = {
    canPublish:
      summary.unassignedSlotCount === 0 && summary.invalidAssignmentCount === 0,
    blockingReasons: buildPublishBlockingReasons({
      unassignedSlotCount: summary.unassignedSlotCount,
      invalidAssignmentCount: summary.invalidAssignmentCount
    })
  };

  return {
    summary,
    doctorWorkloadRows,
    biasSummaryColumns,
    biasSummaryRows,
    holidayCoverageRows,
    groupConstraintImpactRows,
    invalidAssignmentRows,
    publishReadiness,
    warnings: [...input.preview.warnings]
  };
}

async function applyDraftChanges(
  draft: RosterWizardDraft,
  changes: RosterWizardDraftChanges | undefined,
  currentStep: RosterWizardStep,
  actorId: EntityId,
  nextBaseBiasSnapshot: ReadonlyArray<BiasLedger> | undefined,
  dependencies: Pick<
    RosterWizardServiceDependencies,
    | "doctorRepository"
    | "groupConstraintTemplateRepository"
    | "dutyDesignRepository"
    | "biasCriteriaManagementService"
    | "dutyLocationManagementService"
    | "shiftTypeManagementService"
    | "leaveManagementService"
    | "offRequestService"
  >
): Promise<RosterWizardDraft> {
  const validatedStepOneDraft = validateRosterWizardStepOneDraft({
    rosterMonth: changes?.rosterMonth ?? draft.rosterMonth,
    customRange:
      changes?.customRange !== undefined
        ? changes.customRange
          ? { ...changes.customRange }
          : undefined
        : draft.customRange
          ? { ...draft.customRange }
          : undefined,
    publicHolidayDates: [
      ...(changes?.publicHolidayDates ?? draft.publicHolidayDates)
    ]
  });
  const [doctors, templates, dutyDesigns] = await Promise.all([
    dependencies.doctorRepository.list(),
    dependencies.groupConstraintTemplateRepository.list(),
    dependencies.dutyDesignRepository.listAll()
  ]);
  const validatedStepTwoDraft = validateRosterWizardStepTwoDraft({
    effectiveRange: validatedStepOneDraft.effectiveRange,
    groupConstraints: changes?.groupConstraints ?? draft.groupConstraints,
    excludedDoctorPeriods:
      changes?.excludedDoctorPeriods ?? draft.excludedDoctorPeriods,
    templates,
    doctors
  });
  const shouldRejectUnavailableDutyDesigns =
    draft.currentStep === 3 || changes?.dutyDesignAssignments !== undefined;
  const validatedStepThreeDraft = validateRosterWizardStepThreeDraft({
    effectiveRange: validatedStepOneDraft.effectiveRange,
    publicHolidayDates: validatedStepOneDraft.publicHolidayDates,
      dutyDesignAssignments:
        changes?.dutyDesignAssignments ?? draft.dutyDesignAssignments,
      dutyDesigns,
      rejectUnavailableDutyDesigns: shouldRejectUnavailableDutyDesigns,
      rejectInvalidHolidayOverrideDates: shouldRejectUnavailableDutyDesigns
    });
  const baseBiasSnapshot = (
    nextBaseBiasSnapshot ?? draft.baseBiasSnapshot
  ).map(cloneBiasLedger);
  const sourceData = await loadRosterWizardGenerationSourceData(dependencies, {
    rosterMonth: validatedStepOneDraft.rosterMonth,
    effectiveRange: validatedStepOneDraft.effectiveRange
  });
  const simulation = simulateManualRosterAllocation({
    rosterId: draft.id,
    rosterMonth: validatedStepOneDraft.rosterMonth,
    actorId,
    range: validatedStepOneDraft.effectiveRange,
    doctors: sourceData.doctors,
    shiftTypes: sourceData.shiftTypes,
    dutyDesigns,
    dutyDesignAssignments: validatedStepThreeDraft.dutyDesignAssignments,
    publicHolidayDates: validatedStepOneDraft.publicHolidayDates,
    leaves: sourceData.leaves,
    offRequests: sourceData.offRequests,
    baseBiasSnapshot,
    activeBiasCriteria: sourceData.activeBiasCriteria,
    activeDutyLocations: sourceData.activeDutyLocations,
    fallbackLocationId: sourceData.fallbackLocationId,
    allowedDoctorGroupIdByDate: validatedStepTwoDraft.allowedDoctorGroupIdByDate,
    excludedDoctorsByDate: validatedStepTwoDraft.excludedDoctorsByDate,
    manualShiftAssignments:
      changes?.manualShiftAssignments ?? draft.manualShiftAssignments
  });

  return {
    ...draft,
    name:
      changes?.name !== undefined ? normalizeDraftName(changes.name) : draft.name,
    rosterMonth: validatedStepOneDraft.rosterMonth,
    customRange: validatedStepOneDraft.customRange,
    publicHolidayDates: [...validatedStepOneDraft.publicHolidayDates],
    groupConstraintTemplateIds: [...validatedStepTwoDraft.groupConstraintTemplateIds],
    groupConstraints: validatedStepTwoDraft.groupConstraints.map((constraint) => ({
      ...constraint
    })),
    excludedDoctorPeriods: validatedStepTwoDraft.excludedDoctorPeriods.map(
      (period) => ({ ...period })
    ),
      dutyDesignAssignments: validatedStepThreeDraft.dutyDesignAssignments.map(
        (assignment) => ({ ...assignment })
      ),
      manualShiftAssignments: cloneManualShiftAssignments(
        simulation.normalizedManualShiftAssignments
      ),
      baseBiasSnapshot: baseBiasSnapshot.map(cloneBiasLedger),
      currentBiasSnapshot: simulation.currentBiasSnapshot.map(cloneBiasLedger),
      currentStep,
      updatedAt: new Date().toISOString()
    };
}

function withStatus(
  draft: RosterWizardDraft,
  status: RosterWizardDraft["status"]
): RosterWizardDraft {
  return {
    ...cloneDraft(draft),
    status,
    updatedAt: new Date().toISOString()
  };
}

async function loadOwnedDraft(
  repository: RosterWizardDraftRepository,
  draftId: EntityId,
  actorId: EntityId
): Promise<RosterWizardDraft> {
  const draft = await repository.findById(draftId);

  if (!draft || draft.createdByActorId !== actorId) {
    throw new RepositoryNotFoundError(`Roster wizard draft '${draftId}' was not found.`);
  }

  return draft;
}

async function loadStepFourContext(
  dependencies: Pick<
    RosterWizardServiceDependencies,
    | "doctorRepository"
    | "groupConstraintTemplateRepository"
    | "dutyDesignRepository"
    | "biasCriteriaManagementService"
    | "dutyLocationManagementService"
    | "shiftTypeManagementService"
    | "leaveManagementService"
    | "offRequestService"
  >,
  draft: RosterWizardDraft
) {
  const validatedStepOneDraft = validateRosterWizardStepOneDraft({
    rosterMonth: draft.rosterMonth,
    customRange: draft.customRange ? { ...draft.customRange } : undefined,
    publicHolidayDates: [...draft.publicHolidayDates]
  });
  const [doctors, templates, dutyDesigns] = await Promise.all([
    dependencies.doctorRepository.list(),
    dependencies.groupConstraintTemplateRepository.list(),
    dependencies.dutyDesignRepository.listAll()
  ]);
  const validatedStepTwoDraft = validateRosterWizardStepTwoDraft({
    effectiveRange: validatedStepOneDraft.effectiveRange,
    groupConstraints: draft.groupConstraints,
    excludedDoctorPeriods: draft.excludedDoctorPeriods,
    templates,
    doctors
  });
  const validatedStepThreeDraft = validateRosterWizardStepThreeDraft({
    effectiveRange: validatedStepOneDraft.effectiveRange,
    publicHolidayDates: validatedStepOneDraft.publicHolidayDates,
    dutyDesignAssignments: draft.dutyDesignAssignments,
    dutyDesigns,
    rejectUnavailableDutyDesigns: false,
    rejectInvalidHolidayOverrideDates: false
  });
  const sourceData = await loadRosterWizardGenerationSourceData(dependencies, {
    rosterMonth: validatedStepOneDraft.rosterMonth,
    effectiveRange: validatedStepOneDraft.effectiveRange
  });
  const simulation = simulateManualRosterAllocation({
    rosterId: draft.id,
    rosterMonth: draft.rosterMonth,
    actorId: draft.createdByActorId,
    range: validatedStepOneDraft.effectiveRange,
    doctors: sourceData.doctors,
    shiftTypes: sourceData.shiftTypes,
    dutyDesigns,
    dutyDesignAssignments: validatedStepThreeDraft.dutyDesignAssignments,
    publicHolidayDates: validatedStepOneDraft.publicHolidayDates,
    leaves: sourceData.leaves,
    offRequests: sourceData.offRequests,
    baseBiasSnapshot: draft.baseBiasSnapshot,
    activeBiasCriteria: sourceData.activeBiasCriteria,
    activeDutyLocations: sourceData.activeDutyLocations,
    fallbackLocationId: sourceData.fallbackLocationId,
    allowedDoctorGroupIdByDate: validatedStepTwoDraft.allowedDoctorGroupIdByDate,
    excludedDoctorsByDate: validatedStepTwoDraft.excludedDoctorsByDate,
    manualShiftAssignments: draft.manualShiftAssignments
  });
  const preview = buildStepFourPreview({
    effectiveRange: validatedStepOneDraft.effectiveRange,
    publicHolidayDates: validatedStepOneDraft.publicHolidayDates,
    allowedDoctorGroupIdByDate: validatedStepTwoDraft.allowedDoctorGroupIdByDate,
    excludedDoctorsByDate: validatedStepTwoDraft.excludedDoctorsByDate,
    currentBiasSnapshot: simulation.currentBiasSnapshot,
    warnings: simulation.warnings,
    shiftStatesById: simulation.shiftStatesById,
    doctors: sourceData.doctors,
    activeDutyLocations: sourceData.activeDutyLocations
  });

  return {
    validatedStepOneDraft,
    validatedStepTwoDraft,
    validatedStepThreeDraft,
    dutyDesigns,
    sourceData,
    simulation,
    preview
  };
}

export function createRosterWizardService(
  dependencies: RosterWizardServiceDependencies
): RosterWizardService {
  return {
    async createDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const timestamp = new Date().toISOString();
      const currentBiasSnapshot = await dependencies.biasManagementService.listBiasLedgers(
        input.rosterMonth
      );
      const draft: RosterWizardDraft = {
        id: crypto.randomUUID(),
        name: normalizeDraftName(input.name ?? buildDefaultDraftName(input.rosterMonth)),
        createdByActorId: input.actorId,
        createdAt: timestamp,
        updatedAt: timestamp,
        rosterMonth: input.rosterMonth,
        publicHolidayDates: [],
        groupConstraintTemplateIds: [],
        groupConstraints: [],
        excludedDoctorPeriods: [],
        dutyDesignAssignments: [],
        manualShiftAssignments: [],
        baseBiasSnapshot: currentBiasSnapshot.map(cloneBiasLedger),
        currentBiasSnapshot: currentBiasSnapshot.map(cloneBiasLedger),
        status: "DRAFT",
        currentStep: 1
      };
      const savedDraft =
        await dependencies.rosterWizardDraftRepository.save(cloneDraft(draft));

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_CREATED",
        draft: savedDraft
      });

      return savedDraft;
    },
    async saveDraftStep(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const currentStep = ensureStep(input.currentStep);
      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status === "LOCKED") {
        throw new Error("Locked wizard drafts must be unlocked before editing.");
      }

      const nextRosterMonth = input.changes?.rosterMonth ?? draft.rosterMonth;
      const nextBaseBiasSnapshot =
        nextRosterMonth !== draft.rosterMonth
          ? await dependencies.biasManagementService.listBiasLedgers(nextRosterMonth)
          : undefined;
      const nextDraft = await applyDraftChanges(
        draft,
        input.changes,
        currentStep,
        input.actorId,
        nextBaseBiasSnapshot,
        dependencies
      );
      const savedDraft =
        await dependencies.rosterWizardDraftRepository.save(nextDraft);

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_UPDATED",
        draft: savedDraft
      });

      return savedDraft;
    },
    async loadDraftById(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      return loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );
    },
    async listDraftsByAdmin(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      return dependencies.rosterWizardDraftRepository.list({
        createdByActorId: input.actorId,
        rosterMonth: input.rosterMonth,
        statuses: input.statuses
      });
    },
    async loadStepFourPreview(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );
      const { preview } = await loadStepFourContext(dependencies, draft);

      return preview;
    },
    async loadStepFourShiftDetails(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );
      const context = await loadStepFourContext(dependencies, draft);

      return buildStepFourShiftDetails({
        shiftId: input.shiftId,
        simulation: context.simulation,
        preview: context.preview,
        doctors: context.sourceData.doctors
      });
    },
    async loadStepFiveReview(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );
      const context = await loadStepFourContext(dependencies, draft);

      return buildStepFiveReview(context);
    },
    async setManualShiftAssignment(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status === "LOCKED") {
        throw new Error("Locked wizard drafts must be unlocked before editing.");
      }

      const context = await loadStepFourContext(dependencies, draft);
      const shiftState = context.simulation.shiftStatesById.get(input.shiftId);

      if (!shiftState) {
        throw new RepositoryNotFoundError(`Wizard shift '${input.shiftId}' was not found.`);
      }

      if (input.doctorId !== null) {
        const doctor = context.sourceData.doctors.find((entry) => entry.id === input.doctorId);

        if (!doctor) {
          throw new RepositoryNotFoundError(`Doctor '${input.doctorId}' was not found.`);
        }

        if (!doctor.isActive) {
          throw new Error(`Doctor '${doctor.name}' is inactive and cannot be assigned.`);
        }

        const eligibilityDecision = shiftState.eligibility.find(
          (entry) => entry.doctorId === input.doctorId
        );

        if (!eligibilityDecision?.isEligible) {
          throw new Error(
            eligibilityDecision?.reasons[0] ??
              "The selected doctor is not eligible for this shift."
          );
        }
      }

      const nextManualShiftAssignments = draft.manualShiftAssignments
        .filter((assignment) => assignment.shiftId !== input.shiftId)
        .concat(
          input.doctorId === null
            ? []
            : [
                {
                  shiftId: input.shiftId,
                  doctorId: input.doctorId
                }
              ]
        );
      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        await applyDraftChanges(
          draft,
          {
            manualShiftAssignments: nextManualShiftAssignments
          },
          draft.currentStep,
          input.actorId,
          undefined,
          dependencies
        )
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_UPDATED",
        draft: savedDraft,
        extraDetails: {
          stepFourShiftId: input.shiftId,
          stepFourAssignedDoctorId: input.doctorId
        }
      });

      const savedContext = await loadStepFourContext(dependencies, savedDraft);

      return {
        draft: savedDraft,
        preview: savedContext.preview
      };
    },
    async publishDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status === "LOCKED") {
        throw new Error("Locked wizard drafts must be unlocked before publishing.");
      }

      if (draft.status !== "DRAFT" && draft.status !== "PUBLISHED") {
        throw new RepositoryNotFoundError(
          `Roster wizard draft '${input.draftId}' was not found.`
        );
      }

      if (draft.currentStep !== 5) {
        throw new Error("Roster wizard drafts can only be published from Step 5.");
      }

      const context = await loadStepFourContext(dependencies, draft);
      const review = buildStepFiveReview(context);

      if (!review.publishReadiness.canPublish) {
        throw new Error(review.publishReadiness.blockingReasons.join(" "));
      }

      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        withStatus(
          {
            ...draft,
            manualShiftAssignments: cloneManualShiftAssignments(
              context.simulation.normalizedManualShiftAssignments
            ),
            currentBiasSnapshot: context.simulation.currentBiasSnapshot.map(
              cloneBiasLedger
            )
          },
          "LOCKED"
        )
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_PUBLISHED",
        draft: savedDraft,
        extraDetails: {
          previousStatus: draft.status,
          nextStatus: "LOCKED",
          assignedSlotCount: review.summary.assignedSlotCount,
          unassignedSlotCount: review.summary.unassignedSlotCount,
          invalidAssignmentCount: review.summary.invalidAssignmentCount,
          holidayCount: review.summary.holidayCount,
          constrainedDateCount: review.summary.constrainedDateCount
        }
      });

      return savedDraft;
    },
    async lockDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status !== "PUBLISHED") {
        throw new RepositoryNotFoundError(
          `Published roster wizard '${input.draftId}' was not found.`
        );
      }

      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        withStatus(draft, "LOCKED")
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_LOCKED",
        draft: savedDraft,
        extraDetails: {
          previousStatus: "PUBLISHED",
          nextStatus: "LOCKED"
        }
      });

      return savedDraft;
    },
    async unlockDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      if (draft.status !== "LOCKED") {
        throw new Error("Only locked wizard drafts can be unlocked.");
      }

      const savedDraft = await dependencies.rosterWizardDraftRepository.save(
        withStatus(draft, "PUBLISHED")
      );

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_UNLOCKED",
        draft: savedDraft,
        extraDetails: {
          previousStatus: "LOCKED",
          nextStatus: "PUBLISHED"
        }
      });

      return savedDraft;
    },
    async deleteDraft(input) {
      assertAdminActorRole(
        input.actorRole,
        "You do not have permission to manage roster wizard drafts."
      );

      const draft = await loadOwnedDraft(
        dependencies.rosterWizardDraftRepository,
        input.draftId,
        input.actorId
      );

      await dependencies.rosterWizardDraftRepository.delete(input.draftId);

      await logRosterWizardDraftLifecycleEvent(dependencies.auditLogService, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: "ROSTER_WIZARD_DRAFT_DELETED",
        draft
      });
    }
  };
}
