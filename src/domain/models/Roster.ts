import type {
  EntityId,
  ISODateString,
  ISODateTimeString,
  RosterStatus,
  WeekendGroup
} from "@/domain/models/primitives";

export interface RosterPeriod {
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
}

export interface WeekendGroupScheduleEntry {
  readonly weekendStartDate: ISODateString;
  readonly offGroup: WeekendGroup;
}

export interface Roster {
  readonly id: EntityId;
  readonly period: RosterPeriod;
  readonly status: RosterStatus;
  readonly isDeleted: boolean;
  readonly deletedAt?: ISODateTimeString;
  readonly deletedByActorId?: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly createdByUserId: EntityId;
  readonly generatedAt?: ISODateTimeString;
  readonly publishedAt?: ISODateTimeString;
  readonly lockedAt?: ISODateTimeString;
  readonly weekendGroupSchedule?: ReadonlyArray<WeekendGroupScheduleEntry>;
  readonly notes?: string;
}
