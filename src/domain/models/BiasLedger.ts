import type {
  EntityId,
  ISODateTimeString,
  YearMonthString
} from "@/domain/models/primitives";

export interface BiasBalance {
  readonly weekdayDay: number;
  readonly weekdayNight: number;
  readonly weekendDay: number;
  readonly weekendNight: number;
}

export type BiasLedgerSource =
  | "ROSTER_GENERATION"
  | "MANUAL_ADJUSTMENT"
  | "RESET";

export interface BiasLedger {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly balance: BiasBalance;
  readonly source: BiasLedgerSource;
  readonly sourceReferenceId?: EntityId;
  readonly updatedAt: ISODateTimeString;
  readonly updatedByActorId: EntityId;
}

