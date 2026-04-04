import type {
  EntityId,
  ISODateTimeString
} from "@/domain/models/primitives";

export interface DutyDesignBlock {
  readonly shiftTypeId: EntityId;
  readonly locationId?: EntityId;
  readonly doctorCount: number;
  readonly offOffsetDays?: number;
  readonly followUpDutyDesignId?: EntityId;
}

export interface DutyDesign {
  readonly id: EntityId;
  readonly code: string;
  readonly label: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly isHolidayDesign: boolean;
  readonly dutyBlocks: ReadonlyArray<DutyDesignBlock>;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
