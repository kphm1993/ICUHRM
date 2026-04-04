import type {
  EntityId,
  ISODateTimeString,
  ShiftKind,
  TimeOfDayString
} from "@/domain/models/primitives";

export interface ShiftType {
  readonly id: EntityId;
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
  readonly category: ShiftKind;
  readonly isActive: boolean;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
