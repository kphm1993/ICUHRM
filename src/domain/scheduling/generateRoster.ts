import type {
  Assignment,
  BiasLedger,
  Doctor,
  EntityId,
  Shift,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";
import {
  createEmptyBiasBalance,
  createEmptyWeekdayPairBiasBalance,
  readBiasBucketValue,
  readWeekdayPairBiasBucketValue,
  roundBiasValue,
  writeBiasBucketValue,
  writeWeekdayPairBiasBucketValue
} from "@/domain/scheduling/biasBuckets";
import { DEFAULT_SCHEDULING_ENGINE_CONFIG } from "@/domain/scheduling/config";
import type {
  BiasBucket,
  GenerateRosterInput,
  GenerateRosterOutput
} from "@/domain/scheduling/contracts";
import { checkShiftEligibility } from "@/domain/scheduling/checkEligibility";
import { compareShiftsForAssignment } from "@/domain/scheduling/shiftClassification";
import {
  computeAvailabilityAwareFairShare,
  computeAvailabilityAwareWeekdayPairFairShare,
  countGeneratedShiftsByBucket,
  countGeneratedShiftsByWeekdayPair,
  initializeFairnessWorkingState,
  recordAssignmentForShift,
  recordEligibilityForShift
} from "@/domain/scheduling/fairnessState";
import { generateShiftPool } from "@/domain/scheduling/generateShiftPool";
import { scoreCandidates } from "@/domain/scheduling/scoreCandidates";
import { validateGeneratedRoster } from "@/domain/scheduling/validateRoster";

function toYearMonthString(date: string): YearMonthString {
  return date.slice(0, 7) as YearMonthString;
}

function indexDoctorsById(doctors: ReadonlyArray<Doctor>): Readonly<Record<EntityId, Doctor>> {
  return doctors.reduce<Record<EntityId, Doctor>>((result, doctor) => {
    result[doctor.id] = doctor;
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

function findExistingWeekdayPairBiasLedger(
  ledgers: ReadonlyArray<WeekdayPairBiasLedger>,
  doctorId: EntityId
): WeekdayPairBiasLedger | null {
  return ledgers.find((entry) => entry.doctorId === doctorId) ?? null;
}

function computeUpdatedBiasLedger(
  input: GenerateRosterInput,
  shifts: ReadonlyArray<Shift>,
  fairnessState: ReturnType<typeof initializeFairnessWorkingState>,
  timestamp: string
): ReadonlyArray<BiasLedger> {
  const totalShiftCounts = countGeneratedShiftsByBucket(shifts);
  const effectiveMonth = toYearMonthString(input.range.startDate);

  return input.doctors.map((doctor) => {
    const existingLedger = findExistingBiasLedger(input.currentBias, doctor.id);
    let nextBalance = existingLedger?.balance ?? createEmptyBiasBalance();

    for (const bucket of Object.keys(totalShiftCounts) as BiasBucket[]) {
      const assignedCount =
        fairnessState.doctorSnapshots[doctor.id]?.assignedByBucket[bucket] ?? 0;
      const fairShare = computeAvailabilityAwareFairShare(
        fairnessState,
        doctor.id,
        bucket,
        totalShiftCounts[bucket]
      );
      const existingValue = readBiasBucketValue(nextBalance, bucket);
      const nextValue = roundBiasValue(existingValue + assignedCount - fairShare);

      nextBalance = writeBiasBucketValue(nextBalance, bucket, nextValue);
    }

    return {
      id: existingLedger?.id ?? crypto.randomUUID(),
      doctorId: doctor.id,
      effectiveMonth,
      balance: nextBalance,
      source: "ROSTER_GENERATION" as const,
      sourceReferenceId: input.rosterId,
      updatedAt: timestamp,
      updatedByActorId: input.generatedByActorId
    };
  });
}

function computeUpdatedWeekdayPairBiasLedger(
  input: GenerateRosterInput,
  shifts: ReadonlyArray<Shift>,
  fairnessState: ReturnType<typeof initializeFairnessWorkingState>,
  timestamp: string
): ReadonlyArray<WeekdayPairBiasLedger> {
  const totalShiftCounts = countGeneratedShiftsByWeekdayPair(shifts);
  const effectiveMonth = toYearMonthString(input.range.startDate);

  return input.doctors.map((doctor) => {
    const existingLedger = findExistingWeekdayPairBiasLedger(
      input.currentWeekdayPairBias,
      doctor.id
    );
    let nextBalance =
      existingLedger?.balance ?? createEmptyWeekdayPairBiasBalance();

    for (const bucket of Object.keys(totalShiftCounts)) {
      const pairBucket = bucket as keyof typeof totalShiftCounts;
      const assignedCount =
        fairnessState.doctorSnapshots[doctor.id]?.assignedByWeekdayPair[pairBucket] ??
        0;
      const fairShare = computeAvailabilityAwareWeekdayPairFairShare(
        fairnessState,
        doctor.id,
        pairBucket,
        totalShiftCounts[pairBucket]
      );
      const existingValue = readWeekdayPairBiasBucketValue(nextBalance, pairBucket);
      const nextValue = roundBiasValue(existingValue + assignedCount - fairShare);

      nextBalance = writeWeekdayPairBiasBucketValue(
        nextBalance,
        pairBucket,
        nextValue
      );
    }

    return {
      id: existingLedger?.id ?? crypto.randomUUID(),
      doctorId: doctor.id,
      effectiveMonth,
      balance: nextBalance,
      source: "ROSTER_GENERATION" as const,
      sourceReferenceId: input.rosterId,
      updatedAt: timestamp,
      updatedByActorId: input.generatedByActorId
    };
  });
}

export function generateRoster(
  input: GenerateRosterInput
): GenerateRosterOutput {
  const config = input.config ?? DEFAULT_SCHEDULING_ENGINE_CONFIG;
  const warnings = new Set<string>();
  const generatedAt = new Date().toISOString();
  const assignments: Assignment[] = [];
  const doctorsById = indexDoctorsById(input.doctors);
  let fairnessState = initializeFairnessWorkingState(input.doctors);

  const shifts = [...generateShiftPool({
    rosterId: input.rosterId,
    range: input.range,
    shiftTypes: input.shiftTypes,
    weekendGroupSchedule: input.weekendGroupSchedule
  })].sort(compareShiftsForAssignment);
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift] as const));

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
    fairnessState = recordEligibilityForShift(fairnessState, shift, eligibility);

    const candidateScores = scoreCandidates({
      shift,
      eligibility,
      currentBias: input.currentBias,
      currentWeekdayPairBias: input.currentWeekdayPairBias,
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
    fairnessState = recordAssignmentForShift(fairnessState, shift, selectedDoctor.id);
  }

  const updatedBias = computeUpdatedBiasLedger(input, shifts, fairnessState, generatedAt);
  const updatedWeekdayPairBias = computeUpdatedWeekdayPairBiasLedger(
    input,
    shifts,
    fairnessState,
    generatedAt
  );

  const validation = validateGeneratedRoster({
    doctors: input.doctors,
    leaves: input.leaves,
    shifts,
    assignments,
    weekendGroupSchedule: input.weekendGroupSchedule
  });

  return {
    shifts,
    assignments,
    updatedBias,
    updatedWeekdayPairBias,
    validation,
    warnings: Array.from(warnings)
  };
}
