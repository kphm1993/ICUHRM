import type { Doctor, EntityId } from "@/domain/models";
import type {
  CriteriaCountMap,
  DoctorFairnessLoadSnapshot,
  EligibilityDecision,
  FairnessWorkingState
} from "@/domain/scheduling/contracts";

function cloneCriteriaCountMap(counts: CriteriaCountMap): CriteriaCountMap {
  return { ...counts };
}

function createEmptyCriteriaCountMap(
  criteriaIds: ReadonlyArray<EntityId>
): CriteriaCountMap {
  return criteriaIds.reduce<Record<EntityId, number>>((result, criteriaId) => {
    result[criteriaId] = 0;
    return result;
  }, {});
}

function cloneDoctorFairnessSnapshot(
  snapshot: DoctorFairnessLoadSnapshot
): DoctorFairnessLoadSnapshot {
  return {
    doctorId: snapshot.doctorId,
    eligibleByCriteria: cloneCriteriaCountMap(snapshot.eligibleByCriteria),
    assignedByCriteria: cloneCriteriaCountMap(snapshot.assignedByCriteria),
    totalAssignedCount: snapshot.totalAssignedCount
  };
}

function createDoctorFairnessSnapshot(
  doctorId: EntityId,
  criteriaIds: ReadonlyArray<EntityId>
): DoctorFairnessLoadSnapshot {
  return {
    doctorId,
    eligibleByCriteria: createEmptyCriteriaCountMap(criteriaIds),
    assignedByCriteria: createEmptyCriteriaCountMap(criteriaIds),
    totalAssignedCount: 0
  };
}

function incrementCriteriaCounts(
  counts: CriteriaCountMap,
  criteriaIds: ReadonlyArray<EntityId>
): CriteriaCountMap {
  if (criteriaIds.length === 0) {
    return cloneCriteriaCountMap(counts);
  }

  const nextCounts: Record<EntityId, number> = {
    ...counts
  };

  for (const criteriaId of criteriaIds) {
    nextCounts[criteriaId] = (nextCounts[criteriaId] ?? 0) + 1;
  }

  return nextCounts;
}

export function initializeFairnessWorkingState(input: {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly criteriaIds: ReadonlyArray<EntityId>;
}): FairnessWorkingState {
  return {
    criteriaIds: [...input.criteriaIds],
    doctorSnapshots: input.doctors.reduce<Record<EntityId, DoctorFairnessLoadSnapshot>>(
      (result, doctor) => {
        result[doctor.id] = createDoctorFairnessSnapshot(
          doctor.id,
          input.criteriaIds
        );
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
    state.doctorSnapshots[doctorId] ??
      createDoctorFairnessSnapshot(doctorId, state.criteriaIds)
  );
}

export function recordEligibilityForShift(
  state: FairnessWorkingState,
  decisions: ReadonlyArray<EligibilityDecision>,
  matchingCriteriaIds: ReadonlyArray<EntityId>
): FairnessWorkingState {
  if (matchingCriteriaIds.length === 0) {
    return state;
  }

  const nextSnapshots = { ...state.doctorSnapshots };

  for (const decision of decisions) {
    if (!decision.isEligible) {
      continue;
    }

    const currentSnapshot =
      nextSnapshots[decision.doctorId] ??
      createDoctorFairnessSnapshot(decision.doctorId, state.criteriaIds);

    nextSnapshots[decision.doctorId] = {
      ...currentSnapshot,
      eligibleByCriteria: incrementCriteriaCounts(
        currentSnapshot.eligibleByCriteria,
        matchingCriteriaIds
      )
    };
  }

  return {
    ...state,
    doctorSnapshots: nextSnapshots
  };
}

export function recordAssignmentForShift(
  state: FairnessWorkingState,
  doctorId: EntityId,
  matchingCriteriaIds: ReadonlyArray<EntityId>
): FairnessWorkingState {
  const currentSnapshot =
    state.doctorSnapshots[doctorId] ??
    createDoctorFairnessSnapshot(doctorId, state.criteriaIds);

  const nextSnapshot: DoctorFairnessLoadSnapshot = {
    ...currentSnapshot,
    assignedByCriteria: incrementCriteriaCounts(
      currentSnapshot.assignedByCriteria,
      matchingCriteriaIds
    ),
    totalAssignedCount: currentSnapshot.totalAssignedCount + 1
  };

  return {
    ...state,
    doctorSnapshots: {
      ...state.doctorSnapshots,
      [doctorId]: nextSnapshot
    }
  };
}

export function countGeneratedShiftsByCriteria(
  criteriaIdsByShiftId: ReadonlyMap<EntityId, ReadonlyArray<EntityId>>
): CriteriaCountMap {
  const counts: Record<EntityId, number> = {};

  for (const criteriaIds of criteriaIdsByShiftId.values()) {
    for (const criteriaId of criteriaIds) {
      counts[criteriaId] = (counts[criteriaId] ?? 0) + 1;
    }
  }

  return counts;
}

export function sumAssignedCountsForCriteria(
  snapshot: DoctorFairnessLoadSnapshot,
  criteriaIds: ReadonlyArray<EntityId>
): number {
  return criteriaIds.reduce(
    (sum, criteriaId) => sum + (snapshot.assignedByCriteria[criteriaId] ?? 0),
    0
  );
}

export function computeAvailabilityAwareFairShare(
  state: FairnessWorkingState,
  doctorId: EntityId,
  criteriaId: EntityId,
  totalShiftCount: number
): number {
  const doctorSnapshot = state.doctorSnapshots[doctorId];

  if (!doctorSnapshot) {
    return 0;
  }

  const totalEligibleAppearances = Object.values(state.doctorSnapshots).reduce(
    (sum, snapshot) => sum + (snapshot.eligibleByCriteria[criteriaId] ?? 0),
    0
  );

  if (totalEligibleAppearances === 0 || totalShiftCount === 0) {
    return 0;
  }

  return (
    totalShiftCount * (doctorSnapshot.eligibleByCriteria[criteriaId] ?? 0)
  ) / totalEligibleAppearances;
}
