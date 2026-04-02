import type {
  EntityId,
  ISODateTimeString,
  WeekendGroup
} from "@/domain/models/primitives";

export interface Doctor {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly name: string;
  readonly phoneNumber: string;
  readonly uniqueIdentifier: string;
  readonly weekendGroup: WeekendGroup;
  readonly isActive: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

