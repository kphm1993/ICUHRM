import type {
  Assignment,
  AllowedDoctorGroupIdByDate,
  BiasCriteria,
  BiasLedger,
  Doctor,
  DutyDesign,
  DutyDesignAssignment,
  DutyLocation,
  EntityId,
  ISODateString,
  Leave,
  OffRequest,
  PriorityLevel,
  RosterPeriod,
  Shift,
  ShiftType,
  WeekendGroupScheduleEntry
} from "@/domain/models";
import type { SchedulingEngineConfig } from "@/domain/scheduling/config";

export type { AllowedDoctorGroupIdByDate } from "@/domain/models";

export type CriteriaCountMap = Readonly<Record<EntityId, number>>;
export type ShiftPoolSource =
  | "DUTY_DESIGN_STANDARD"
  | "DUTY_DESIGN_HOLIDAY_OVERRIDE"
  | "LEGACY_FALLBACK";

export type BlockedDatesByDoctorId = ReadonlyMap<
  EntityId,
  ReadonlySet<ISODateString>
>;
export type ExcludedDoctorsByDate = ReadonlyMap<
  ISODateString,
  ReadonlySet<EntityId>
>;

export interface GeneratedShiftMetadata {
  readonly source: ShiftPoolSource;
  readonly sourceDate: ISODateString;
  readonly dutyDesignId?: EntityId;
  readonly dutyDesignBlockIndex?: number;
  readonly slotIndex?: number;
  readonly offOffsetDays?: number;
  readonly followUpDutyDesignId?: EntityId;
}

export interface DoctorFairnessLoadSnapshot {
  readonly doctorId: EntityId;
  readonly eligibleByCriteria: CriteriaCountMap;
  readonly assignedByCriteria: CriteriaCountMap;
  readonly totalAssignedCount: number;
}

export interface FairnessWorkingState {
  readonly criteriaIds: ReadonlyArray<EntityId>;
  readonly doctorSnapshots: Readonly<Record<EntityId, DoctorFairnessLoadSnapshot>>;
}

export interface CandidateTieBreakMetadata {
  readonly criteriaAssignedCount: number;
  readonly totalAssignedCount: number;
  readonly offRequestPenalty: number;
  readonly offRequestPriority: PriorityLevel | null;
  readonly doctorId: EntityId;
}

export type ValidationIssueCode =
  | "SHIFT_UNASSIGNED"
  | "SHIFT_MULTI_ASSIGNED"
  | "ASSIGNMENT_ON_LEAVE"
  | "ASSIGNMENT_DOCTOR_EXCLUDED"
  | "ASSIGNMENT_SAME_DAY_CONFLICT"
  | "ASSIGNMENT_REST_AFTER_NIGHT_VIOLATION"
  | "ASSIGNMENT_GROUP_CONSTRAINT_VIOLATION"
  | "SHIFT_LOCATION_INVALID"
  | "BIAS_LEDGER_UNKNOWN_CRITERIA"
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
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly publicHolidayDates?: ReadonlyArray<ISODateString>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly fallbackLocationId: EntityId;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly excludedDoctorsByDate?: ExcludedDoctorsByDate;
  readonly weekendGroupSchedule?: ReadonlyArray<WeekendGroupScheduleEntry>;
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
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly publicHolidayDates?: ReadonlyArray<ISODateString>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly fallbackLocationId: EntityId;
  readonly weekendGroupSchedule?: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface GenerateShiftPoolOutput {
  readonly shifts: ReadonlyArray<Shift>;
  readonly shiftMetadataById: ReadonlyMap<EntityId, GeneratedShiftMetadata>;
  readonly warnings: ReadonlyArray<string>;
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
  readonly shiftMetadataById: ReadonlyMap<EntityId, GeneratedShiftMetadata>;
  readonly blockedDatesByDoctorId: BlockedDatesByDoctorId;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly excludedDoctorsByDate?: ExcludedDoctorsByDate;
  readonly weekendGroupSchedule?: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface CandidateScoreBreakdown {
  readonly criteriaBiasScore: number;
  readonly criteriaAssignedLoadScore: number;
  readonly offRequestPenalty: number;
  readonly overallLoadScore: number;
}

export interface CandidateScore {
  readonly doctorId: EntityId;
  readonly totalScore: number;
  readonly breakdown: CandidateScoreBreakdown;
  readonly tieBreak: CandidateTieBreakMetadata;
  readonly matchedCriteriaIds: ReadonlyArray<EntityId>;
  readonly notes: ReadonlyArray<string>;
}

export interface ScoreCandidatesInput {
  readonly shift: Shift;
  readonly eligibility: ReadonlyArray<EligibilityDecision>;
  readonly currentBias: ReadonlyArray<BiasLedger>;
  readonly matchingCriteria: ReadonlyArray<BiasCriteria>;
  readonly offRequests: ReadonlyArray<OffRequest>;
  readonly fairnessState: FairnessWorkingState;
  readonly config: SchedulingEngineConfig;
}

export interface ValidateRosterInput {
  readonly doctors: ReadonlyArray<Doctor>;
  readonly leaves: ReadonlyArray<Leave>;
  readonly shifts: ReadonlyArray<Shift>;
  readonly assignments: ReadonlyArray<Assignment>;
  readonly updatedBias: ReadonlyArray<BiasLedger>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly excludedDoctorsByDate?: ExcludedDoctorsByDate;
  readonly weekendGroupSchedule?: ReadonlyArray<WeekendGroupScheduleEntry>;
}
