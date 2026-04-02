import type {
  Assignment,
  BiasBalance,
  BiasLedger,
  Doctor,
  EntityId,
  Leave,
  OffRequest,
  PriorityLevel,
  RosterPeriod,
  Shift,
  ShiftType,
  WeekdayPairBiasBalance,
  WeekdayPairBiasBucket,
  WeekdayPairBiasLedger,
  WeekendGroupScheduleEntry
} from "@/domain/models";
import type { SchedulingEngineConfig } from "@/domain/scheduling/config";

export type BiasBucket = "weekdayDay" | "weekdayNight" | "weekendDay" | "weekendNight";

export type BiasBucketCounts = Readonly<Record<BiasBucket, number>>;
export type WeekdayPairBiasBucketCounts = Readonly<
  Record<WeekdayPairBiasBucket, number>
>;

export interface DoctorFairnessLoadSnapshot {
  readonly doctorId: EntityId;
  readonly eligibleByBucket: BiasBucketCounts;
  readonly assignedByBucket: BiasBucketCounts;
  readonly eligibleByWeekdayPair: WeekdayPairBiasBucketCounts;
  readonly assignedByWeekdayPair: WeekdayPairBiasBucketCounts;
  readonly totalAssignedCount: number;
}

export interface FairnessWorkingState {
  readonly doctorSnapshots: Readonly<Record<EntityId, DoctorFairnessLoadSnapshot>>;
}

export interface CandidateTieBreakMetadata {
  readonly bucketAssignedCount: number;
  readonly weekdayPairAssignedCount: number;
  readonly totalAssignedCount: number;
  readonly offRequestPenalty: number;
  readonly offRequestPriority: PriorityLevel | null;
  readonly doctorId: EntityId;
}

export type ValidationIssueCode =
  | "SHIFT_UNASSIGNED"
  | "SHIFT_MULTI_ASSIGNED"
  | "ASSIGNMENT_ON_LEAVE"
  | "ASSIGNMENT_SAME_DAY_CONFLICT"
  | "ASSIGNMENT_REST_AFTER_NIGHT_VIOLATION"
  | "ASSIGNMENT_WEEKEND_OFF_GROUP"
  | "ASSIGNMENT_FRIDAY_NIGHT_OFF_GROUP"
  | "MISSING_WEEKEND_GROUP_SCHEDULE";

export interface ValidationIssue {
  readonly code: ValidationIssueCode;
  readonly message: string;
  readonly shiftId?: EntityId;
  readonly assignmentId?: EntityId;
  readonly doctorId?: EntityId;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly issues: ReadonlyArray<ValidationIssue>;
}

export interface GenerateRosterInput {
  readonly rosterId: EntityId;
  readonly range: RosterPeriod;
  readonly doctors: ReadonlyArray<Doctor>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly generatedByActorId: EntityId;
  readonly config?: SchedulingEngineConfig;
}

export interface GenerateRosterOutput {
  readonly shifts: ReadonlyArray<Shift>;
  readonly assignments: ReadonlyArray<Assignment>;
  readonly updatedBias: ReadonlyArray<BiasLedger>;
  readonly updatedWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
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
  readonly currentAssignments: ReadonlyArray<Assignment>;
  readonly shiftsById: ReadonlyMap<EntityId, Shift>;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface CandidateScoreBreakdown {
  readonly primaryBiasScore: number;
  readonly primaryBucketLoadScore: number;
  readonly secondaryWeekdayPairBiasScore: number;
  readonly secondaryWeekdayPairLoadScore: number;
  readonly offRequestPenalty: number;
  readonly overallLoadScore: number;
}

export interface CandidateScore {
  readonly doctorId: EntityId;
  readonly totalScore: number;
  readonly breakdown: CandidateScoreBreakdown;
  readonly tieBreak: CandidateTieBreakMetadata;
  readonly biasBucket: BiasBucket | null;
  readonly weekdayPairBiasBucket: WeekdayPairBiasBucket | null;
  readonly notes: ReadonlyArray<string>;
}

export interface ScoreCandidatesInput {
  readonly shift: Shift;
  readonly eligibility: ReadonlyArray<EligibilityDecision>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly currentWeekdayPairBias: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly fairnessState: FairnessWorkingState;
  readonly config: SchedulingEngineConfig;
}

export interface ValidateRosterInput {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly shifts: ReadonlyArray<Shift>;
  readonly assignments: ReadonlyArray<Assignment>;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface BiasUpdateEntry {
  readonly doctorId: EntityId;
  readonly balance: BiasBalance;
}

export interface WeekdayPairBiasUpdateEntry {
  readonly doctorId: EntityId;
  readonly balance: WeekdayPairBiasBalance;
}
