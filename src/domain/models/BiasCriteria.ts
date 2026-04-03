import type {
  DayOfWeek,
  EntityId,
  ISODateTimeString
} from "@/domain/models/primitives";

export interface BiasCriteria {
  readonly id: EntityId;
  readonly code: string;
  readonly label: string;
  readonly locationIds: ReadonlyArray<EntityId>;
  readonly shiftTypeIds: ReadonlyArray<EntityId>;
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>;
  readonly isWeekendOnly: boolean;
  readonly isActive: boolean;
  readonly isLocked: boolean;
  readonly lockedAt?: ISODateTimeString;
  readonly lockedByActorId?: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
  readonly createdByActorId: EntityId;
  readonly updatedByActorId: EntityId;
}
