import type { BiasLedgerSource } from "@/domain/models/BiasLedger";
import type {
  EntityId,
  ISODateTimeString,
  YearMonthString
} from "@/domain/models/primitives";

export type WeekdayPairBiasBucket =
  | "mondayDay"
  | "mondayNight"
  | "tuesdayDay"
  | "tuesdayNight"
  | "wednesdayDay"
  | "wednesdayNight"
  | "thursdayDay"
  | "thursdayNight"
  | "fridayDay"
  | "fridayNight";

export interface WeekdayPairBiasBalance {
  readonly mondayDay: number;
  readonly mondayNight: number;
  readonly tuesdayDay: number;
  readonly tuesdayNight: number;
  readonly wednesdayDay: number;
  readonly wednesdayNight: number;
  readonly thursdayDay: number;
  readonly thursdayNight: number;
  readonly fridayDay: number;
  readonly fridayNight: number;
}

export interface WeekdayPairBiasLedger {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly balance: WeekdayPairBiasBalance;
  readonly source: BiasLedgerSource;
  readonly sourceReferenceId?: EntityId;
  readonly updatedAt: ISODateTimeString;
  readonly updatedByActorId: EntityId;
}

