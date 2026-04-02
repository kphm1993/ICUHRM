import type {
  EntityId,
  ISODateString,
  ISODateTimeString,
  OffRequestShiftPreference,
  PriorityLevel,
  YearMonthString
} from "@/domain/models/primitives";

export interface OffRequest {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly rosterMonth: YearMonthString;
  readonly date: ISODateString;
  readonly shiftPreference: OffRequestShiftPreference;
  readonly priority: PriorityLevel;
  readonly requestedAt: ISODateTimeString;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

