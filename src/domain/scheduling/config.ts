export interface SchedulingScoreWeights {
  readonly biasWeight: number;
  readonly bucketAssignedWeight: number;
  readonly weekdayPairBiasWeight: number;
  readonly weekdayPairAssignedWeight: number;
  readonly offRequestPenaltyWeight: number;
  readonly overallAssignedWeight: number;
}

export type DeterministicTieBreaker =
  | "totalScore"
  | "bucketAssignedCount"
  | "weekdayPairAssignedCount"
  | "totalAssignedCount"
  | "offRequestPenalty"
  | "doctorId";

export interface SchedulingEngineConfig {
  readonly scoring: SchedulingScoreWeights;
  readonly deterministicTieBreakers: ReadonlyArray<DeterministicTieBreaker>;
}

export const DEFAULT_SCHEDULING_ENGINE_CONFIG: SchedulingEngineConfig = {
  scoring: {
    biasWeight: 10,
    bucketAssignedWeight: 6,
    weekdayPairBiasWeight: 3,
    weekdayPairAssignedWeight: 2,
    offRequestPenaltyWeight: 4,
    overallAssignedWeight: 1
  },
  // Tie-break order must stay deterministic and explainable:
  // 1. lower total score
  // 2. fewer assignments in the relevant fairness bucket
  // 3. fewer assignments in the relevant weekday pair bucket
  // 4. fewer assignments overall in the current generation
  // 5. lower off-request conflict penalty
  // 6. lower doctor id
  deterministicTieBreakers: [
    "totalScore",
    "bucketAssignedCount",
    "weekdayPairAssignedCount",
    "totalAssignedCount",
    "offRequestPenalty",
    "doctorId"
  ]
};
