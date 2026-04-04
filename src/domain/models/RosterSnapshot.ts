import type {
  Assignment,
  BiasCriteria,
  BiasLedger,
  DoctorGroup,
  DutyDesign,
  DutyLocation,
  EntityId,
  ISODateString,
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
  readonly groupId?: EntityId;
  readonly groupName?: string;
  readonly weekendGroup?: WeekendGroup;
  readonly isActive: boolean;
}

export interface DutyDesignAssignmentSnapshotEntry {
  readonly standardDesignId?: EntityId;
  readonly holidayOverrideDesignId?: EntityId;
}

export type DutyDesignAssignmentsSnapshot = Readonly<
  Record<ISODateString, DutyDesignAssignmentSnapshotEntry>
>;

export type DutyDesignSnapshot = Readonly<Record<EntityId, DutyDesign>>;
export type DoctorGroupSnapshot = Readonly<Record<EntityId, DoctorGroup>>;
export type AllowedDoctorGroupIdByDate = Readonly<Record<ISODateString, EntityId>>;

export interface GeneratedRosterInputSummary {
  readonly rosterMonth: YearMonthString;
  readonly range: RosterPeriod;
  readonly activeDoctorCount: number;
  readonly leaveCount: number;
  readonly offRequestCount: number;
  readonly shiftTypeCount: number;
  readonly firstWeekendOffGroup?: WeekendGroup;
  readonly weekendGroupSchedule?: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly activeBiasCriteria: ReadonlyArray<BiasCriteria>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly doctorGroupSnapshot: DoctorGroupSnapshot;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly dutyDesignAssignments: DutyDesignAssignmentsSnapshot;
  readonly dutyDesignSnapshot: DutyDesignSnapshot;
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly fallbackLocationId: EntityId;
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
