import type {
  Assignment,
  BiasCriteria,
  BiasLedger,
  Doctor,
  EntityId,
  ISODateString,
  ManualShiftAssignment,
  RosterPeriod,
  Shift,
  ShiftType,
  YearMonthString
} from "@/domain/models";
import { roundBiasValue } from "@/domain/scheduling/biasBuckets";
import { DEFAULT_SCHEDULING_ENGINE_CONFIG } from "@/domain/scheduling/config";
import type {
  AllowedDoctorGroupIdByDate,
  BlockedDatesByDoctorId,
  CandidateScore,
  EligibilityDecision,
  ExcludedDoctorsByDate,
  GeneratedShiftMetadata
} from "@/domain/scheduling/contracts";
import {
  checkBiasEligibility,
  checkShiftEligibility
} from "@/domain/scheduling/checkEligibility";
import { determineBiasCriteriaForShift } from "@/domain/scheduling/determineBiasCriteria";
import { addDays, parseIsoDate, toIsoDate } from "@/domain/scheduling/dateUtils";
import {
  initializeFairnessWorkingState,
  recordAssignmentForShift,
  recordEligibilityForShift
} from "@/domain/scheduling/fairnessState";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";
import { scoreCandidates } from "@/domain/scheduling/scoreCandidates";
import { compareShiftsForAssignment } from "@/domain/scheduling/shiftClassification";

export interface SimulateManualRosterAllocationInput {
  readonly rosterId: EntityId;
  readonly rosterMonth: YearMonthString;
  readonly actorId: EntityId;
  readonly range: RosterPeriod;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly dutyDesigns: ReadonlyArray<import("@/domain/models").DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<import("@/domain/models").DutyDesignAssignment>;
  readonly publicHolidayDates?: ReadonlyArray<ISODateString>;
  readonly leaves: ReadonlyArray<import("@/domain/models").Leave>;
  readonly offRequests: ReadonlyArray<import("@/domain/models").OffRequest>;
  readonly baseBiasSnapshot: ReadonlyArray<BiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<import("@/domain/models").DutyLocation>;
  readonly fallbackLocationId: EntityId;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly excludedDoctorsByDate?: ExcludedDoctorsByDate;
  readonly manualShiftAssignments: ReadonlyArray<ManualShiftAssignment>;
}

export interface SimulatedManualShiftState {
  readonly shift: Shift;
  readonly shiftMetadata?: GeneratedShiftMetadata;
  readonly matchingCriteria: ReadonlyArray<BiasCriteria>;
  readonly eligibility: ReadonlyArray<EligibilityDecision>;
  readonly candidateScores: ReadonlyArray<CandidateScore>;
  readonly selectedManualAssignment?: ManualShiftAssignment;
  readonly selectedDoctor?: Doctor;
  readonly assignmentStatus: "UNASSIGNED" | "ASSIGNED" | "INVALID";
  readonly invalidReasons: ReadonlyArray<string>;
  readonly overallRecommendedDoctorId?: EntityId;
}

export interface SimulatedManualRosterAllocation {
  readonly shifts: ReadonlyArray<Shift>;
  readonly shiftMetadataById: ReadonlyMap<EntityId, GeneratedShiftMetadata>;
  readonly warnings: ReadonlyArray<string>;
  readonly normalizedManualShiftAssignments: ReadonlyArray<ManualShiftAssignment>;
  readonly acceptedAssignments: ReadonlyArray<Assignment>;
  readonly currentBiasSnapshot: ReadonlyArray<BiasLedger>;
  readonly shiftStatesById: ReadonlyMap<EntityId, SimulatedManualShiftState>;
}

function indexEntriesById<T extends { readonly id: EntityId }>(
  entries: ReadonlyArray<T>
): Readonly<Record<EntityId, T>> {
  return entries.reduce<Record<EntityId, T>>((result, entry) => {
    result[entry.id] = entry;
    return result;
  }, {});
}

function sortManualShiftAssignments(
  assignments: ReadonlyArray<ManualShiftAssignment>
): ReadonlyArray<ManualShiftAssignment> {
  return [...assignments]
    .map((assignment) => ({ ...assignment }))
    .sort((left, right) => {
      const shiftComparison = left.shiftId.localeCompare(right.shiftId);
      return shiftComparison !== 0
        ? shiftComparison
        : left.doctorId.localeCompare(right.doctorId);
    });
}

function getBlockedDatesSnapshot(
  blockedDatesByDoctorId: ReadonlyMap<EntityId, Set<ISODateString>>
): BlockedDatesByDoctorId {
  return new Map(
    Array.from(blockedDatesByDoctorId.entries()).map(([doctorId, blockedDates]) => [
      doctorId,
      new Set(blockedDates)
    ])
  );
}

function createAcceptedAssignment(
  shift: Shift,
  doctorId: EntityId,
  timestamp: string
): Assignment {
  return {
    id: `${shift.id}:assignment`,
    rosterId: shift.rosterId,
    shiftId: shift.id,
    assignedDoctorId: doctorId,
    actualDoctorId: doctorId,
    fairnessOwnerDoctorId: doctorId,
    source: "ADMIN_OVERRIDE",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function applyDutyDesignOffOffset(input: {
  readonly blockedDatesByDoctorId: Map<EntityId, Set<ISODateString>>;
  readonly doctorId: EntityId;
  readonly shift: Shift;
  readonly shiftMetadata: GeneratedShiftMetadata | undefined;
}): void {
  const offOffsetDays = input.shiftMetadata?.offOffsetDays;

  if (offOffsetDays === undefined || offOffsetDays < 0) {
    return;
  }

  const blockedDate = toIsoDate(addDays(parseIsoDate(input.shift.date), offOffsetDays));
  const blockedDates =
    input.blockedDatesByDoctorId.get(input.doctorId) ?? new Set<ISODateString>();

  blockedDates.add(blockedDate);
  input.blockedDatesByDoctorId.set(input.doctorId, blockedDates);
}

function createLiveBiasSnapshot(input: {
  readonly rosterId: EntityId;
  readonly rosterMonth: YearMonthString;
  readonly actorId: EntityId;
  readonly baseBiasSnapshot: ReadonlyArray<BiasLedger>;
  readonly acceptedAssignments: ReadonlyArray<Assignment>;
  readonly shiftStatesById: ReadonlyMap<EntityId, SimulatedManualShiftState>;
}): ReadonlyArray<BiasLedger> {
  const ledgersByDoctorId = new Map<EntityId, BiasLedger>(
    input.baseBiasSnapshot.map((entry) => [
      entry.doctorId,
      {
        ...entry,
        balances: { ...entry.balances }
      }
    ])
  );
  const timestamp = new Date().toISOString();

  input.acceptedAssignments.forEach((assignment) => {
    const shiftState = input.shiftStatesById.get(assignment.shiftId);

    if (!shiftState) {
      return;
    }

    const existingLedger = ledgersByDoctorId.get(assignment.assignedDoctorId) ?? {
      id: crypto.randomUUID(),
      doctorId: assignment.assignedDoctorId,
      effectiveMonth: input.rosterMonth,
      balances: {},
      source: "ROSTER_GENERATION" as const,
      sourceReferenceId: input.rosterId,
      updatedAt: timestamp,
      updatedByActorId: input.actorId
    };
    const nextBalances = { ...existingLedger.balances };

    shiftState.matchingCriteria.forEach((criteria) => {
      nextBalances[criteria.id] = roundBiasValue((nextBalances[criteria.id] ?? 0) + 1);
    });

    ledgersByDoctorId.set(assignment.assignedDoctorId, {
      ...existingLedger,
      balances: nextBalances,
      source: "ROSTER_GENERATION",
      sourceReferenceId: input.rosterId,
      updatedAt: timestamp,
      updatedByActorId: input.actorId
    });
  });

  return Array.from(ledgersByDoctorId.values()).sort((left, right) =>
    left.doctorId.localeCompare(right.doctorId)
  );
}

export function simulateManualRosterAllocation(
  input: SimulateManualRosterAllocationInput
): SimulatedManualRosterAllocation {
  const config = DEFAULT_SCHEDULING_ENGINE_CONFIG;
  const simulationTimestamp = new Date().toISOString();
  const doctorsById = indexEntriesById(input.doctors);
  const shiftTypesById = indexEntriesById(input.shiftTypes);
  const dutyLocationsById = indexEntriesById(input.activeDutyLocations);
  const blockedDatesByDoctorId = new Map<EntityId, Set<ISODateString>>();
  const normalizedManualAssignmentsByShiftId = new Map<EntityId, ManualShiftAssignment>();
  const acceptedAssignments: Assignment[] = [];
  const shiftStatesById = new Map<EntityId, SimulatedManualShiftState>();
  let fairnessState = initializeFairnessWorkingState({
    doctors: input.doctors,
    criteriaIds: input.activeBiasCriteria.map((criteria) => criteria.id)
  });

  const shiftPool = generateShiftPool({
    rosterId: input.rosterId,
    range: input.range,
    shiftTypes: input.shiftTypes,
    dutyDesigns: input.dutyDesigns,
    dutyDesignAssignments: input.dutyDesignAssignments,
    publicHolidayDates: input.publicHolidayDates,
    activeDutyLocations: input.activeDutyLocations,
    fallbackLocationId: input.fallbackLocationId
  });
  const shifts = [...shiftPool.shifts].sort(compareShiftsForAssignment);
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift] as const));
  const validShiftIds = new Set(shifts.map((shift) => shift.id));

  sortManualShiftAssignments(input.manualShiftAssignments).forEach((assignment) => {
    if (!validShiftIds.has(assignment.shiftId)) {
      return;
    }

    normalizedManualAssignmentsByShiftId.set(assignment.shiftId, {
      ...assignment
    });
  });

  shifts.forEach((shift) => {
    const shiftMetadata = shiftPool.shiftMetadataById.get(shift.id);
    const selectedManualAssignment = normalizedManualAssignmentsByShiftId.get(shift.id);
    const shiftType = shiftTypesById[shift.shiftTypeId];
    const location = dutyLocationsById[shift.locationId];
    const eligibilityInput = {
      shift,
      doctors: input.doctors,
      leaves: input.leaves,
      currentAssignments: acceptedAssignments,
      shiftsById,
      shiftMetadataById: shiftPool.shiftMetadataById,
      blockedDatesByDoctorId: getBlockedDatesSnapshot(blockedDatesByDoctorId),
      allowedDoctorGroupIdByDate: input.allowedDoctorGroupIdByDate,
      excludedDoctorsByDate: input.excludedDoctorsByDate,
      weekendGroupSchedule: undefined
    };
    const eligibility = checkShiftEligibility(eligibilityInput);
    const matchingCriteria =
      shiftType && location
        ? determineBiasCriteriaForShift({
            shift,
            shiftType,
            location,
            activeCriteria: input.activeBiasCriteria
          })
        : [];
    const biasEligibility = checkBiasEligibility(eligibilityInput);
    fairnessState = recordEligibilityForShift(
      fairnessState,
      biasEligibility,
      matchingCriteria.map((criteria) => criteria.id)
    );

    if (!shiftType) {
      shiftStatesById.set(shift.id, {
        shift,
        shiftMetadata,
        matchingCriteria: [],
        eligibility,
        candidateScores: [],
        selectedManualAssignment,
        assignmentStatus: selectedManualAssignment ? "INVALID" : "UNASSIGNED",
        invalidReasons: selectedManualAssignment
          ? [
              `Shift type '${shift.shiftTypeId}' is missing from the active Step 4 source data.`
            ]
          : [],
        overallRecommendedDoctorId: undefined
      });
      return;
    }

    if (!location) {
      shiftStatesById.set(shift.id, {
        shift,
        shiftMetadata,
        matchingCriteria,
        eligibility,
        candidateScores: [],
        selectedManualAssignment,
        assignmentStatus: selectedManualAssignment ? "INVALID" : "UNASSIGNED",
        invalidReasons: selectedManualAssignment
          ? [
              `Duty location '${shift.locationId}' is missing from the active Step 4 source data.`
            ]
          : [],
        overallRecommendedDoctorId: undefined
      });
      return;
    }

    const candidateScores = scoreCandidates({
      shift,
      eligibility,
      currentBias: input.baseBiasSnapshot,
      matchingCriteria,
      offRequests: input.offRequests,
      fairnessState,
      config
    });
    const assignedDoctor = selectedManualAssignment
      ? doctorsById[selectedManualAssignment.doctorId]
      : undefined;
    const assignmentEligibility = selectedManualAssignment
      ? eligibility.find((decision) => decision.doctorId === selectedManualAssignment.doctorId)
      : undefined;
    const invalidReasons: string[] = [];
    let assignmentStatus: SimulatedManualShiftState["assignmentStatus"] = "UNASSIGNED";

    if (selectedManualAssignment) {
      if (!assignedDoctor) {
        assignmentStatus = "INVALID";
        invalidReasons.push(
          `Assigned doctor '${selectedManualAssignment.doctorId}' could not be resolved.`
        );
      } else if (!assignmentEligibility?.isEligible) {
        assignmentStatus = "INVALID";
        invalidReasons.push(
          ...(assignmentEligibility?.reasons.length
            ? assignmentEligibility.reasons
            : ["Assigned doctor is no longer eligible for this shift."])
        );
      } else {
        assignmentStatus = "ASSIGNED";
      }
    }

    if (assignmentStatus === "ASSIGNED" && selectedManualAssignment) {
      acceptedAssignments.push(
        createAcceptedAssignment(
          shift,
          selectedManualAssignment.doctorId,
          simulationTimestamp
        )
      );
      applyDutyDesignOffOffset({
        blockedDatesByDoctorId,
        doctorId: selectedManualAssignment.doctorId,
        shift,
        shiftMetadata
      });
      fairnessState = recordAssignmentForShift(
        fairnessState,
        selectedManualAssignment.doctorId,
        matchingCriteria.map((criteria) => criteria.id)
      );
    }

    shiftStatesById.set(shift.id, {
      shift,
      shiftMetadata,
      matchingCriteria,
      eligibility,
      candidateScores,
      selectedManualAssignment,
      selectedDoctor: assignedDoctor,
      assignmentStatus,
      invalidReasons,
      overallRecommendedDoctorId: candidateScores[0]?.doctorId
    });
  });

  return {
    shifts,
    shiftMetadataById: shiftPool.shiftMetadataById,
    warnings: [...shiftPool.warnings],
    normalizedManualShiftAssignments: Array.from(normalizedManualAssignmentsByShiftId.values()),
    acceptedAssignments,
    currentBiasSnapshot: createLiveBiasSnapshot({
      rosterId: input.rosterId,
      rosterMonth: input.rosterMonth,
      actorId: input.actorId,
      baseBiasSnapshot: input.baseBiasSnapshot,
      acceptedAssignments,
      shiftStatesById
    }),
    shiftStatesById
  };
}
