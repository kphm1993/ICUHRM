import type {
  EntityId,
  ISODateString,
  ISODateTimeString
} from "@/domain/models/primitives";

export interface Leave {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly startDate: ISODateString;
  readonly endDate: ISODateString;
  readonly reason?: string;
  readonly createdByUserId: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

