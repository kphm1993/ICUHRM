import type {
  Assignment,
  BiasLedger,
  EntityId,
  Roster,
  RosterPeriod,
  Shift,
  WeekdayPairBiasLedger,
  WeekendGroup,
  WeekendGroupScheduleEntry,
  YearMonthString
} from "@/domain/models";
import type { ValidationResult } from "@/domain/scheduling/contracts";

export interface RosterSnapshotDoctorReference {
  readonly doctorId: EntityId;
  readonly name: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly isActive: boolean;
}

export interface GeneratedRosterInputSummary {
  readonly rosterMonth: YearMonthString;
  readonly range: RosterPeriod;
  readonly activeDoctorCount: number;
  readonly leaveCount: number;
  readonly offRequestCount: number;
  readonly shiftTypeCount: number;
  readonly firstWeekendOffGroup: WeekendGroup;
  readonly weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>;
}

export interface RosterSnapshot {
  readonly roster: Roster;
  readonly doctorReferences: ReadonlyArray<RosterSnapshotDoctorReference>;
  readonly shifts: ReadonlyArray<Shift>;
  readonly assignments: ReadonlyArray<Assignment>;
  readonly warnings: ReadonlyArray<string>;
  readonly validation: ValidationResult;
  readonly updatedBias: ReadonlyArray<BiasLedger>;
  readonly updatedWeekdayPairBias?: ReadonlyArray<WeekdayPairBiasLedger>;
  readonly derivedFromRosterId?: EntityId;
  readonly generatedInputSummary: GeneratedRosterInputSummary;
}
