import type {
  Assignment,
  BiasLedger,
  BiasCriteria,
  Doctor,
  DutyLocation,
  EntityId,
  Shift,
  ShiftType,
  YearMonthString
} from "@/domain/models";
import {
  createEmptyBiasLedgerBalances,
  roundBiasValue
} from "@/domain/scheduling/biasBuckets";
import { DEFAULT_SCHEDULING_ENGINE_CONFIG } from "@/domain/scheduling/config";
import type { GenerateRosterInput, GenerateRosterOutput } from "@/domain/scheduling/contracts";
import { checkShiftEligibility } from "@/domain/scheduling/checkEligibility";
import { determineBiasCriteriaForShift } from "@/domain/scheduling/determineBiasCriteria";
import { compareShiftsForAssignment } from "@/domain/scheduling/shiftClassification";
import {
  computeAvailabilityAwareFairShare,
  countGeneratedShiftsByCriteria,
  initializeFairnessWorkingState,
  recordAssignmentForShift,
  recordEligibilityForShift
} from "@/domain/scheduling/fairnessState";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";
import { scoreCandidates } from "@/domain/scheduling/scoreCandidates";
import { validateGeneratedRoster } from "@/domain/scheduling/validateRoster";
import { NoCriteriaDefinedError } from "@/domain/repositories";

function toYearMonthString(date: string): YearMonthString {
  return date.slice(0, 7) as YearMonthString;
}

function indexEntriesById<T extends { readonly id: EntityId }>(
  entries: ReadonlyArray<T>
): Readonly<Record<EntityId, T>> {
  return entries.reduce<Record<EntityId, T>>((result, entry) => {
    result[entry.id] = entry;
    return result;
  }, {});
}

function createAssignment(shift: Shift, doctorId: EntityId, timestamp: string): Assignment {
  return {
    id: `${shift.id}:assignment`,
    rosterId: shift.rosterId,
    shiftId: shift.id,
    assignedDoctorId: doctorId,
    actualDoctorId: doctorId,
    fairnessOwnerDoctorId: doctorId,
    source: "AUTO",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function findExistingBiasLedger(
  ledgers: ReadonlyArray<BiasLedger>,
  doctorId: EntityId
): BiasLedger | null {
  return ledgers.find((entry) => entry.doctorId === doctorId) ?? null;
}

function assertCriteriaConfigurationIsValid(input: GenerateRosterInput): void {
  if (input.activeBiasCriteria.length === 0) {
    throw new NoCriteriaDefinedError(
      "No active bias criteria defined. Create at least one criteria before generating a roster."
    );
  }

  if (input.activeDutyLocations.length !== 1) {
    throw new Error(
      "Phase 3 roster generation requires exactly one active duty location."
    );
  }

  const activeLocationIds = new Set(
    input.activeDutyLocations
      .filter((location) => location.isActive)
      .map((location) => location.id)
  );
  const activeShiftTypeIds = new Set(
    input.shiftTypes.filter((shiftType) => shiftType.isActive).map((shiftType) => shiftType.id)
  );

  if (!activeLocationIds.has(input.generationLocationId)) {
    throw new Error(
      `Generation location '${input.generationLocationId}' is not an active duty location.`
    );
  }

  for (const criteria of input.activeBiasCriteria) {
    if (!criteria.isActive) {
      throw new Error(
        `Bias criteria '${criteria.code}' must be active before it can be used in roster generation.`
      );
    }

    for (const locationId of criteria.locationIds) {
      if (!activeLocationIds.has(locationId)) {
        throw new Error(
          `Bias criteria '${criteria.code}' references duty location '${locationId}', which is missing or inactive for generation.`
        );
      }
    }

    for (const shiftTypeId of criteria.shiftTypeIds) {
      if (!activeShiftTypeIds.has(shiftTypeId)) {
        throw new Error(
          `Bias criteria '${criteria.code}' references shift type '${shiftTypeId}', which is missing or inactive for generation.`
        );
      }
    }
  }
}

function computeUpdatedBiasLedger(
  input: GenerateRosterInput,
  criteriaIdsByShiftId: ReadonlyMap<EntityId, ReadonlyArray<EntityId>>,
  fairnessState: ReturnType<typeof initializeFairnessWorkingState>,
  timestamp: string
): ReadonlyArray<BiasLedger> {
  const totalShiftCounts = countGeneratedShiftsByCriteria(criteriaIdsByShiftId);
  const effectiveMonth = toYearMonthString(input.range.startDate);

  return input.doctors.map((doctor) => {
    const existingLedger = findExistingBiasLedger(input.currentBias, doctor.id);
    const nextBalance: Record<EntityId, number> = createEmptyBiasLedgerBalances();

    for (const criteria of input.activeBiasCriteria) {
      const assignedCount =
        fairnessState.doctorSnapshots[doctor.id]?.assignedByCriteria[criteria.id] ?? 0;
      const fairShare = computeAvailabilityAwareFairShare(
        fairnessState,
        doctor.id,
        criteria.id,
        totalShiftCounts[criteria.id] ?? 0
      );
      const existingValue = existingLedger?.balances[criteria.id] ?? 0;
      const nextValue = roundBiasValue(existingValue + assignedCount - fairShare);
      nextBalance[criteria.id] = nextValue;
    }

    return {
      id: existingLedger?.id ?? crypto.randomUUID(),
      doctorId: doctor.id,
      effectiveMonth,
      balances: nextBalance,
      source: "ROSTER_GENERATION" as const,
      sourceReferenceId: input.rosterId,
      updatedAt: timestamp,
      updatedByActorId: input.generatedByActorId
    };
  });
}

function warnForUnmatchedCriteriaCoverage(input: {
  readonly shifts: ReadonlyArray<Shift>;
  readonly criteriaIdsByShiftId: ReadonlyMap<EntityId, ReadonlyArray<EntityId>>;
  readonly warnings: Set<string>;
}): void {
  let matchedShiftCount = 0;

  for (const shift of input.shifts) {
    const matchedCriteriaIds = input.criteriaIdsByShiftId.get(shift.id) ?? [];

    if (matchedCriteriaIds.length === 0) {
      input.warnings.add(
        `No active bias criteria matched shift ${shift.id}; scoring used only off-request and overall assignment load.`
      );
      continue;
    }

    matchedShiftCount += 1;
  }

  if (matchedShiftCount === 0 && input.shifts.length > 0) {
    input.warnings.add(
      "No generated shifts matched any active bias criteria in this roster month."
    );
  }
}

export function generateRoster(
  input: GenerateRosterInput
): GenerateRosterOutput {
  assertCriteriaConfigurationIsValid(input);

  const config = input.config ?? DEFAULT_SCHEDULING_ENGINE_CONFIG;
  const warnings = new Set<string>();
  const generatedAt = new Date().toISOString();
  const assignments: Assignment[] = [];
  const doctorsById = indexEntriesById(input.doctors);
  const shiftTypesById = indexEntriesById(input.shiftTypes);
  const dutyLocationsById = indexEntriesById(input.activeDutyLocations);
  let fairnessState = initializeFairnessWorkingState({
    doctors: input.doctors,
    criteriaIds: input.activeBiasCriteria.map((criteria) => criteria.id)
  });

  const shifts = [...generateShiftPool({
    rosterId: input.rosterId,
    range: input.range,
    shiftTypes: input.shiftTypes,
    generationLocationId: input.generationLocationId,
    weekendGroupSchedule: input.weekendGroupSchedule
  })].sort(compareShiftsForAssignment);
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift] as const));
  const criteriaIdsByShiftId = new Map<EntityId, ReadonlyArray<EntityId>>();

  if (toYearMonthString(input.range.startDate) !== toYearMonthString(input.range.endDate)) {
    warnings.add(
      "Roster range spans multiple months; updated bias uses the roster start month as its effective month."
    );
  }

  for (const shift of shifts) {
    const eligibility = checkShiftEligibility({
      shift,
      doctors: input.doctors,
      leaves: input.leaves,
      currentAssignments: assignments,
      shiftsById,
        weekendGroupSchedule: input.weekendGroupSchedule
    });
    const shiftType = shiftTypesById[shift.shiftTypeId] as ShiftType | undefined;
    const location = dutyLocationsById[shift.locationId] as DutyLocation | undefined;

    if (!shiftType) {
      warnings.add(
        `Shift ${shift.id} references shift type ${shift.shiftTypeId}, which is missing from generation input.`
      );
      continue;
    }

    if (!location) {
      warnings.add(
        `Shift ${shift.id} references duty location ${shift.locationId}, which is missing from generation input.`
      );
      continue;
    }

    const matchingCriteria = determineBiasCriteriaForShift({
      shift,
      shiftType,
      location,
      activeCriteria: input.activeBiasCriteria
    });
    const matchingCriteriaIds = matchingCriteria.map((criteria) => criteria.id);
    criteriaIdsByShiftId.set(shift.id, matchingCriteriaIds);
    fairnessState = recordEligibilityForShift(
      fairnessState,
      eligibility,
      matchingCriteriaIds
    );

    const candidateScores = scoreCandidates({
      shift,
      eligibility,
      currentBias: input.currentBias,
      matchingCriteria,
      offRequests: input.offRequests,
      fairnessState,
      config
    });

    if (candidateScores.length === 0) {
      warnings.add(`No eligible candidates resolved for shift ${shift.id}.`);
      continue;
    }

    const selectedCandidate = candidateScores[0];
    const selectedDoctor = doctorsById[selectedCandidate.doctorId];

    if (!selectedDoctor) {
      warnings.add(
        `Candidate ${selectedCandidate.doctorId} could not be resolved to a doctor record for shift ${shift.id}.`
      );
      continue;
    }

    assignments.push(createAssignment(shift, selectedDoctor.id, generatedAt));
    fairnessState = recordAssignmentForShift(
      fairnessState,
      selectedDoctor.id,
      matchingCriteriaIds
    );
  }

  warnForUnmatchedCriteriaCoverage({
    shifts,
    criteriaIdsByShiftId,
    warnings
  });

  const updatedBias = computeUpdatedBiasLedger(
    input,
    criteriaIdsByShiftId,
    fairnessState,
    generatedAt
  );

  const validation = validateGeneratedRoster({
    doctors: input.doctors,
    leaves: input.leaves,
    shifts,
    assignments,
    updatedBias,
    activeBiasCriteria: input.activeBiasCriteria,
    activeDutyLocations: input.activeDutyLocations,
    weekendGroupSchedule: input.weekendGroupSchedule
  });

  return {
    shifts,
    assignments,
    updatedBias,
    validation,
    warnings: Array.from(warnings)
  };
}
