import type {
  EntityId,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";

export interface WeekdayPairBiasLedgerRepository {
  listByMonth(
    effectiveMonth: YearMonthString
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>>;
  listByDoctor(
    doctorId: EntityId
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>>;
  findByDoctorAndMonth(
    doctorId: EntityId,
    effectiveMonth: YearMonthString
  ): Promise<WeekdayPairBiasLedger | null>;
  save(entry: WeekdayPairBiasLedger): Promise<WeekdayPairBiasLedger>;
  saveMany(
    entries: ReadonlyArray<WeekdayPairBiasLedger>
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>>;
}
