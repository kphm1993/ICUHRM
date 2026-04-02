import type {
  Doctor,
  EntityId,
  Shift,
  WeekdayPairBiasBucket
} from "@/domain/models";
import {
  createEmptyBiasBucketCounts,
  createEmptyWeekdayPairBiasBucketCounts,
  resolveShiftBiasBucket
  ,
  resolveShiftWeekdayPairBiasBucket
} from "@/domain/scheduling/biasBuckets";
import type {
  BiasBucket,
  BiasBucketCounts,
  DoctorFairnessLoadSnapshot,
  EligibilityDecision,
  FairnessWorkingState,
  WeekdayPairBiasBucketCounts
} from "@/domain/scheduling/contracts";

function cloneBucketCounts(counts: BiasBucketCounts): BiasBucketCounts {
  return {
    weekdayDay: counts.weekdayDay,
    weekdayNight: counts.weekdayNight,
    weekendDay: counts.weekendDay,
    weekendNight: counts.weekendNight
  };
}

function cloneWeekdayPairBucketCounts(
  counts: WeekdayPairBiasBucketCounts
): WeekdayPairBiasBucketCounts {
  return {
    mondayDay: counts.mondayDay,
    mondayNight: counts.mondayNight,
    tuesdayDay: counts.tuesdayDay,
    tuesdayNight: counts.tuesdayNight,
    wednesdayDay: counts.wednesdayDay,
    wednesdayNight: counts.wednesdayNight,
    thursdayDay: counts.thursdayDay,
    thursdayNight: counts.thursdayNight,
    fridayDay: counts.fridayDay,
    fridayNight: counts.fridayNight
  };
}

function cloneDoctorFairnessSnapshot(
  snapshot: DoctorFairnessLoadSnapshot
): DoctorFairnessLoadSnapshot {
  return {
    doctorId: snapshot.doctorId,
    eligibleByBucket: cloneBucketCounts(snapshot.eligibleByBucket),
    assignedByBucket: cloneBucketCounts(snapshot.assignedByBucket),
    eligibleByWeekdayPair: cloneWeekdayPairBucketCounts(
      snapshot.eligibleByWeekdayPair
    ),
    assignedByWeekdayPair: cloneWeekdayPairBucketCounts(
      snapshot.assignedByWeekdayPair
    ),
    totalAssignedCount: snapshot.totalAssignedCount
  };
}

function createDoctorFairnessSnapshot(doctorId: EntityId): DoctorFairnessLoadSnapshot {
  return {
    doctorId,
    eligibleByBucket: createEmptyBiasBucketCounts(),
    assignedByBucket: createEmptyBiasBucketCounts(),
    eligibleByWeekdayPair: createEmptyWeekdayPairBiasBucketCounts(),
    assignedByWeekdayPair: createEmptyWeekdayPairBiasBucketCounts(),
    totalAssignedCount: 0
  };
}

function incrementBucketCount(
  counts: BiasBucketCounts,
  bucket: BiasBucket
): BiasBucketCounts {
  return {
    ...counts,
    [bucket]: counts[bucket] + 1
  };
}

function incrementWeekdayPairBucketCount(
  counts: WeekdayPairBiasBucketCounts,
  bucket: WeekdayPairBiasBucket
): WeekdayPairBiasBucketCounts {
  return {
    ...counts,
    [bucket]: counts[bucket] + 1
  };
}

export function initializeFairnessWorkingState(
  doctors: ReadonlyArray<Doctor>
): FairnessWorkingState {
  return {
    doctorSnapshots: doctors.reduce<Record<EntityId, DoctorFairnessLoadSnapshot>>(
      (result, doctor) => {
        result[doctor.id] = createDoctorFairnessSnapshot(doctor.id);
        return result;
      },
      {}
    )
  };
}

export function getDoctorFairnessLoadSnapshot(
  state: FairnessWorkingState,
  doctorId: EntityId
): DoctorFairnessLoadSnapshot {
  return cloneDoctorFairnessSnapshot(
    state.doctorSnapshots[doctorId] ?? createDoctorFairnessSnapshot(doctorId)
  );
}

export function recordEligibilityForShift(
  state: FairnessWorkingState,
  shift: Shift,
  decisions: ReadonlyArray<EligibilityDecision>
): FairnessWorkingState {
  const bucket = resolveShiftBiasBucket(shift);
  const weekdayPairBucket = resolveShiftWeekdayPairBiasBucket(shift);

  if (!bucket && !weekdayPairBucket) {
    return state;
  }

  const nextSnapshots = { ...state.doctorSnapshots };

  for (const decision of decisions) {
    if (!decision.isEligible) {
      continue;
    }

    const currentSnapshot = nextSnapshots[decision.doctorId] ?? createDoctorFairnessSnapshot(decision.doctorId);
    nextSnapshots[decision.doctorId] = {
      ...currentSnapshot,
      eligibleByBucket: bucket
        ? incrementBucketCount(currentSnapshot.eligibleByBucket, bucket)
        : cloneBucketCounts(currentSnapshot.eligibleByBucket),
      eligibleByWeekdayPair: weekdayPairBucket
        ? incrementWeekdayPairBucketCount(
            currentSnapshot.eligibleByWeekdayPair,
            weekdayPairBucket
          )
        : cloneWeekdayPairBucketCounts(currentSnapshot.eligibleByWeekdayPair)
    };
  }

  return {
    doctorSnapshots: nextSnapshots
  };
}

export function recordAssignmentForShift(
  state: FairnessWorkingState,
  shift: Shift,
  doctorId: EntityId
): FairnessWorkingState {
  const bucket = resolveShiftBiasBucket(shift);
  const weekdayPairBucket = resolveShiftWeekdayPairBiasBucket(shift);
  const currentSnapshot = state.doctorSnapshots[doctorId] ?? createDoctorFairnessSnapshot(doctorId);

  const nextSnapshot: DoctorFairnessLoadSnapshot = {
    ...currentSnapshot,
    assignedByBucket: bucket
      ? incrementBucketCount(currentSnapshot.assignedByBucket, bucket)
      : cloneBucketCounts(currentSnapshot.assignedByBucket),
    assignedByWeekdayPair: weekdayPairBucket
      ? incrementWeekdayPairBucketCount(
          currentSnapshot.assignedByWeekdayPair,
          weekdayPairBucket
        )
      : cloneWeekdayPairBucketCounts(currentSnapshot.assignedByWeekdayPair),
    totalAssignedCount: currentSnapshot.totalAssignedCount + 1
  };

  return {
    doctorSnapshots: {
      ...state.doctorSnapshots,
      [doctorId]: nextSnapshot
    }
  };
}

export function countGeneratedShiftsByBucket(
  shifts: ReadonlyArray<Shift>
): BiasBucketCounts {
  return shifts.reduce<BiasBucketCounts>((counts, shift) => {
    const bucket = resolveShiftBiasBucket(shift);

    if (!bucket) {
      return counts;
    }

    return incrementBucketCount(counts, bucket);
  }, createEmptyBiasBucketCounts());
}

export function countGeneratedShiftsByWeekdayPair(
  shifts: ReadonlyArray<Shift>
): WeekdayPairBiasBucketCounts {
  return shifts.reduce<WeekdayPairBiasBucketCounts>((counts, shift) => {
    const weekdayPairBucket = resolveShiftWeekdayPairBiasBucket(shift);

    if (!weekdayPairBucket) {
      return counts;
    }

    return incrementWeekdayPairBucketCount(counts, weekdayPairBucket);
  }, createEmptyWeekdayPairBiasBucketCounts());
}

export function computeAvailabilityAwareFairShare(
  state: FairnessWorkingState,
  doctorId: EntityId,
  bucket: BiasBucket,
  totalShiftCount: number
): number {
  const doctorSnapshot = state.doctorSnapshots[doctorId];

  if (!doctorSnapshot) {
    return 0;
  }

  const totalEligibleAppearances = Object.values(state.doctorSnapshots).reduce(
    (sum, snapshot) => sum + snapshot.eligibleByBucket[bucket],
    0
  );

  if (totalEligibleAppearances === 0 || totalShiftCount === 0) {
    return 0;
  }

  return (totalShiftCount * doctorSnapshot.eligibleByBucket[bucket]) / totalEligibleAppearances;
}

export function computeAvailabilityAwareWeekdayPairFairShare(
  state: FairnessWorkingState,
  doctorId: EntityId,
  bucket: WeekdayPairBiasBucket,
  totalShiftCount: number
): number {
  const doctorSnapshot = state.doctorSnapshots[doctorId];

  if (!doctorSnapshot) {
    return 0;
  }

  const totalEligibleAppearances = Object.values(state.doctorSnapshots).reduce(
    (sum, snapshot) => sum + snapshot.eligibleByWeekdayPair[bucket],
    0
  );

  if (totalEligibleAppearances === 0 || totalShiftCount === 0) {
    return 0;
  }

  return (
    totalShiftCount * doctorSnapshot.eligibleByWeekdayPair[bucket]
  ) / totalEligibleAppearances;
}
