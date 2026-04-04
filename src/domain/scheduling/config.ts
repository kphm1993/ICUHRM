export interface SchedulingScoreWeights {
  readonly criteriaBiasWeight: number;
  readonly criteriaBiasPriorityConstant: number;
  readonly criteriaBiasPriorityEpsilon: number;
  readonly criteriaAssignedWeight: number;
  readonly offRequestPenaltyWeight: number;
  readonly overallAssignedWeight: number;
}

export type DeterministicTieBreaker =
  | "totalScore"
  | "criteriaAssignedCount"
  | "totalAssignedCount"
  | "offRequestPenalty"
  | "doctorId";

export interface SchedulingEngineConfig {
  readonly scoring: SchedulingScoreWeights;
  readonly deterministicTieBreakers: ReadonlyArray<DeterministicTieBreaker>;
}

export const DEFAULT_SCHEDULING_ENGINE_CONFIG: SchedulingEngineConfig = {
  scoring: {
    criteriaBiasWeight: 10,
    criteriaBiasPriorityConstant: 1,
    criteriaBiasPriorityEpsilon: 0.0001,
    criteriaAssignedWeight: 6,
    offRequestPenaltyWeight: 4,
    overallAssignedWeight: 1
  },
  // Tie-break order must stay deterministic and explainable:
  // 1. lower total score
  // 2. fewer assignments across the matched fairness criteria
  // 3. fewer assignments overall in the current generation
  // 4. lower off-request conflict penalty
  // 5. lower doctor id
  deterministicTieBreakers: [
    "totalScore",
    "criteriaAssignedCount",
    "totalAssignedCount",
    "offRequestPenalty",
    "doctorId"
  ]
};
