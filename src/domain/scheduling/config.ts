export interface SchedulingScoreWeights {
  readonly biasCorrection: number;
  readonly fairnessDeficit: number;
  readonly offRequestPenalty: number;
  readonly overAssignmentPenalty: number;
}

export interface SchedulingEngineConfig {
  readonly scoring: SchedulingScoreWeights;
  readonly deterministicTieBreakers: ReadonlyArray<
    "totalScore" | "priority" | "timestamp" | "doctorId"
  >;
}

export const DEFAULT_SCHEDULING_ENGINE_CONFIG: SchedulingEngineConfig = {
  scoring: {
    biasCorrection: 1,
    fairnessDeficit: 1,
    offRequestPenalty: 2,
    overAssignmentPenalty: 1
  },
  deterministicTieBreakers: ["totalScore", "priority", "timestamp", "doctorId"]
};

