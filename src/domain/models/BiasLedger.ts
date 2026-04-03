import type {
  EntityId,
  ISODateTimeString,
  YearMonthString
} from "@/domain/models/primitives";

export type LegacyPrimaryBiasCriterionId =
  | "weekdayDay"
  | "weekdayNight"
  | "weekendDay"
  | "weekendNight";

export const LEGACY_PRIMARY_BIAS_CRITERION_IDS = [
  "weekdayDay",
  "weekdayNight",
  "weekendDay",
  "weekendNight"
] as const satisfies ReadonlyArray<LegacyPrimaryBiasCriterionId>;

export type BiasBalance = Readonly<Record<LegacyPrimaryBiasCriterionId, number>>;
export type BiasLedgerBalances = Readonly<Record<EntityId, number>>;

export type BiasLedgerSource =
  | "ROSTER_GENERATION"
  | "MANUAL_ADJUSTMENT"
  | "RESET";

export interface BiasLedger {
  readonly id: EntityId;
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly balances: BiasLedgerBalances;
  readonly source: BiasLedgerSource;
  readonly sourceReferenceId?: EntityId;
  readonly updatedAt: ISODateTimeString;
  readonly updatedByActorId: EntityId;
}
