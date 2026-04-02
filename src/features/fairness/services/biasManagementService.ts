import type {
  BiasBalance,
  BiasLedger,
  EntityId,
  YearMonthString
} from "@/domain/models";
import type { BiasLedgerRepository } from "@/domain/repositories";

export interface AdjustBiasInput {
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly delta: BiasBalance;
  readonly reason: string;
  readonly updatedByActorId: EntityId;
}

export interface BiasManagementService {
  listBiasLedgers(effectiveMonth: YearMonthString): Promise<ReadonlyArray<BiasLedger>>;
  adjustBias(input: AdjustBiasInput): Promise<BiasLedger>;
  resetDoctorBias(
    doctorId: EntityId,
    effectiveMonth: YearMonthString,
    updatedByActorId: EntityId
  ): Promise<BiasLedger>;
  resetAllBias(
    effectiveMonth: YearMonthString,
    updatedByActorId: EntityId
  ): Promise<ReadonlyArray<BiasLedger>>;
}

const EMPTY_BIAS_BALANCE: BiasBalance = {
  weekdayDay: 0,
  weekdayNight: 0,
  weekendDay: 0,
  weekendNight: 0
};

function createZeroBiasBalance(): BiasBalance {
  return { ...EMPTY_BIAS_BALANCE };
}

function addBiasBalances(left: BiasBalance, right: BiasBalance): BiasBalance {
  return {
    weekdayDay: left.weekdayDay + right.weekdayDay,
    weekdayNight: left.weekdayNight + right.weekdayNight,
    weekendDay: left.weekendDay + right.weekendDay,
    weekendNight: left.weekendNight + right.weekendNight
  };
}

export interface BiasManagementServiceDependencies {
  readonly biasLedgerRepository: BiasLedgerRepository;
}

export function createBiasManagementService(
  dependencies: BiasManagementServiceDependencies
): BiasManagementService {
  return {
    async listBiasLedgers(effectiveMonth) {
      return dependencies.biasLedgerRepository.listByMonth(effectiveMonth);
    },
    async adjustBias(input) {
      const existingLedger =
        await dependencies.biasLedgerRepository.findByDoctorAndMonth(
          input.doctorId,
          input.effectiveMonth
        );

      const nextBalance = addBiasBalances(
        existingLedger?.balance ?? createZeroBiasBalance(),
        input.delta
      );

      void input.reason;

      return dependencies.biasLedgerRepository.save({
        id: existingLedger?.id ?? crypto.randomUUID(),
        doctorId: input.doctorId,
        effectiveMonth: input.effectiveMonth,
        balance: nextBalance,
        source: "MANUAL_ADJUSTMENT",
        sourceReferenceId: existingLedger?.sourceReferenceId,
        updatedAt: new Date().toISOString(),
        updatedByActorId: input.updatedByActorId
      });
    },
    async resetDoctorBias(doctorId, effectiveMonth, updatedByActorId) {
      const existingLedger =
        await dependencies.biasLedgerRepository.findByDoctorAndMonth(
          doctorId,
          effectiveMonth
        );

      return dependencies.biasLedgerRepository.save({
        id: existingLedger?.id ?? crypto.randomUUID(),
        doctorId,
        effectiveMonth,
        balance: createZeroBiasBalance(),
        source: "RESET",
        sourceReferenceId: existingLedger?.sourceReferenceId,
        updatedAt: new Date().toISOString(),
        updatedByActorId
      });
    },
    async resetAllBias(effectiveMonth, updatedByActorId) {
      const ledgers = await dependencies.biasLedgerRepository.listByMonth(effectiveMonth);
      const timestamp = new Date().toISOString();

      const resetLedgers = ledgers.map((ledger) => ({
        ...ledger,
        balance: createZeroBiasBalance(),
        source: "RESET" as const,
        updatedAt: timestamp,
        updatedByActorId
      }));

      return dependencies.biasLedgerRepository.saveMany(resetLedgers);
    }
  };
}
