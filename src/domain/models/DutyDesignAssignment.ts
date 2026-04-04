import type {
  EntityId,
  ISODateString,
  ISODateTimeString
} from "@/domain/models/primitives";

export interface DutyDesignAssignment {
  readonly id: EntityId;
  readonly date: ISODateString;
  readonly dutyDesignId: EntityId;
  readonly isHolidayOverride: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
