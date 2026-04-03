import type { BiasLedger, EntityId, YearMonthString } from "@/domain/models";

export interface BiasLedgerRepository {
  listByMonth(effectiveMonth: YearMonthString): Promise<ReadonlyArray<BiasLedger>>;
  listByDoctor(doctorId: EntityId): Promise<ReadonlyArray<BiasLedger>>;
  hasAnyBalanceForCriteria(criteriaId: EntityId): Promise<boolean>;
  findByDoctorAndMonth(
    doctorId: EntityId,
    effectiveMonth: YearMonthString
  ): Promise<BiasLedger | null>;
  save(entry: BiasLedger): Promise<BiasLedger>;
  saveMany(entries: ReadonlyArray<BiasLedger>): Promise<ReadonlyArray<BiasLedger>>;
}
