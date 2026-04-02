import type {
  EntityId,
  GroupEligibility,
  ISODateString,
  ISODateTimeString,
  ShiftCategory,
  ShiftKind,
  ShiftSpecialFlag,
  TimeOfDayString
} from "@/domain/models/primitives";

export interface ShiftDefinitionSnapshot {
  readonly shiftTypeId: EntityId;
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
}

export interface Shift {
  readonly id: EntityId;
  readonly rosterId: EntityId;
  readonly date: ISODateString;
  readonly shiftTypeId: EntityId;
  readonly type: ShiftKind;
  readonly category: ShiftCategory;
  readonly special: ShiftSpecialFlag;
  readonly groupEligibility: GroupEligibility;
  readonly definitionSnapshot: ShiftDefinitionSnapshot;
  readonly createdAt: ISODateTimeString;
}

