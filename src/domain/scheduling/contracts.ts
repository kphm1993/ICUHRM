import type {
  Assignment,
  BiasLedger,
  Doctor,
  EntityId,
  Leave,
  OffRequest,
  RosterPeriod,
  Shift,
  ShiftType,
  WeekendGroupScheduleEntry
} from "@/domain/models";
import type { SchedulingEngineConfig } from "@/domain/scheduling/config";

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
}

export interface GenerateRosterInput {
  readonly rosterId: EntityId;
  readonly range: RosterPeriod;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly generatedByActorId: EntityId;
  readonly config?: SchedulingEngineConfig;
}

export interface GenerateRosterOutput {
  readonly shifts: ReadonlyArray<Shift>;
  readonly assignments: ReadonlyArray<Assignment>;
  readonly updatedBias: ReadonlyArray<BiasLedger>;
  readonly validation: ValidationResult;
  readonly warnings: ReadonlyArray<string>;
}

export interface GenerateShiftPoolInput {
  readonly rosterId: EntityId;
  readonly range: RosterPeriod;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface EligibilityDecision {
  readonly doctorId: EntityId;
  readonly isEligible: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export interface CheckEligibilityInput {
  readonly shift: Shift;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface CandidateScoreBreakdown {
  readonly biasCorrection: number;
  readonly fairnessDeficit: number;
  readonly offRequestPenalty: number;
  readonly overAssignmentPenalty: number;
}

export interface CandidateScore {
  readonly doctorId: EntityId;
  readonly totalScore: number;
  readonly breakdown: CandidateScoreBreakdown;
  readonly notes: ReadonlyArray<string>;
}

export interface ScoreCandidatesInput {
  readonly shift: Shift;
  readonly eligibility: ReadonlyArray<EligibilityDecision>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly config: SchedulingEngineConfig;
}

export interface ValidateRosterInput {
  readonly shifts: ReadonlyArray<Shift>;
  readonly assignments: ReadonlyArray<Assignment>;
}

