import type {
  BiasLedger,
  BiasLedgerBalances,
  EntityId,
  WeekdayPairBiasBalance,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";
import type {
  BiasCriteriaRepository,
  BiasLedgerRepository,
  WeekdayPairBiasLedgerRepository
} from "@/domain/repositories";
import { createEmptyBiasLedgerBalances } from "@/domain/scheduling/biasBuckets";

export interface AdjustBiasInput {
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly delta: BiasLedgerBalances;
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
  listWeekdayPairBiasLedgers(
    effectiveMonth: YearMonthString
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>>;
  adjustWeekdayPairBias(input: AdjustWeekdayPairBiasInput): Promise<WeekdayPairBiasLedger>;
  resetDoctorWeekdayPairBias(
    doctorId: EntityId,
    effectiveMonth: YearMonthString,
    updatedByActorId: EntityId
  ): Promise<WeekdayPairBiasLedger>;
  resetAllWeekdayPairBias(
    effectiveMonth: YearMonthString,
    updatedByActorId: EntityId
  ): Promise<ReadonlyArray<WeekdayPairBiasLedger>>;
}

const EMPTY_WEEKDAY_PAIR_BIAS_BALANCE: WeekdayPairBiasBalance = {
  mondayDay: 0,
  mondayNight: 0,
  tuesdayDay: 0,
  tuesdayNight: 0,
  wednesdayDay: 0,
  wednesdayNight: 0,
  thursdayDay: 0,
  thursdayNight: 0,
  fridayDay: 0,
  fridayNight: 0
};

export interface AdjustWeekdayPairBiasInput {
  readonly doctorId: EntityId;
  readonly effectiveMonth: YearMonthString;
  readonly delta: WeekdayPairBiasBalance;
  readonly reason: string;
  readonly updatedByActorId: EntityId;
}

function addBiasLedgerBalances(
  left: Readonly<Record<EntityId, number>>,
  right: Readonly<Record<EntityId, number>>
): BiasLedgerBalances {
  const criteriaIds = new Set([...Object.keys(left), ...Object.keys(right)]);
  const nextBalances: Record<EntityId, number> = {};

  for (const criteriaId of criteriaIds) {
    nextBalances[criteriaId] = (left[criteriaId] ?? 0) + (right[criteriaId] ?? 0);
  }

  return nextBalances;
}

function createZeroWeekdayPairBiasBalance(): WeekdayPairBiasBalance {
  return { ...EMPTY_WEEKDAY_PAIR_BIAS_BALANCE };
}

function addWeekdayPairBiasBalances(
  left: WeekdayPairBiasBalance,
  right: WeekdayPairBiasBalance
): WeekdayPairBiasBalance {
  return {
    mondayDay: left.mondayDay + right.mondayDay,
    mondayNight: left.mondayNight + right.mondayNight,
    tuesdayDay: left.tuesdayDay + right.tuesdayDay,
    tuesdayNight: left.tuesdayNight + right.tuesdayNight,
    wednesdayDay: left.wednesdayDay + right.wednesdayDay,
    wednesdayNight: left.wednesdayNight + right.wednesdayNight,
    thursdayDay: left.thursdayDay + right.thursdayDay,
    thursdayNight: left.thursdayNight + right.thursdayNight,
    fridayDay: left.fridayDay + right.fridayDay,
    fridayNight: left.fridayNight + right.fridayNight
  };
}

export interface BiasManagementServiceDependencies {
  readonly biasCriteriaRepository: BiasCriteriaRepository;
  readonly biasLedgerRepository: BiasLedgerRepository;
  readonly weekdayPairBiasLedgerRepository: WeekdayPairBiasLedgerRepository;
}

async function listActiveCriteriaIds(
  criteriaRepository: BiasCriteriaRepository
): Promise<ReadonlyArray<EntityId>> {
  const criteria = await criteriaRepository.listActive();
  return criteria.map((entry) => entry.id);
}

function createZeroCriteriaBalances(
  criteriaIds: ReadonlyArray<EntityId>
): BiasLedgerBalances {
  return criteriaIds.reduce<Record<EntityId, number>>((result, criteriaId) => {
    result[criteriaId] = 0;
    return result;
  }, {});
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

      const nextBalance = addBiasLedgerBalances(
        existingLedger?.balances ?? createEmptyBiasLedgerBalances(),
        input.delta
      );

      void input.reason;

      return dependencies.biasLedgerRepository.save({
        id: existingLedger?.id ?? crypto.randomUUID(),
        doctorId: input.doctorId,
        effectiveMonth: input.effectiveMonth,
        balances: nextBalance,
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
      const activeCriteriaIds = await listActiveCriteriaIds(
        dependencies.biasCriteriaRepository
      );

      return dependencies.biasLedgerRepository.save({
        id: existingLedger?.id ?? crypto.randomUUID(),
        doctorId,
        effectiveMonth,
        balances:
          activeCriteriaIds.length > 0
            ? createZeroCriteriaBalances(activeCriteriaIds)
            : createEmptyBiasLedgerBalances(),
        source: "RESET",
        sourceReferenceId: existingLedger?.sourceReferenceId,
        updatedAt: new Date().toISOString(),
        updatedByActorId
      });
    },
    async resetAllBias(effectiveMonth, updatedByActorId) {
      const ledgers = await dependencies.biasLedgerRepository.listByMonth(effectiveMonth);
      const timestamp = new Date().toISOString();
      const activeCriteriaIds = await listActiveCriteriaIds(
        dependencies.biasCriteriaRepository
      );
      const zeroBalances =
        activeCriteriaIds.length > 0
          ? createZeroCriteriaBalances(activeCriteriaIds)
          : createEmptyBiasLedgerBalances();

      const resetLedgers = ledgers.map((ledger) => ({
        ...ledger,
        balances: { ...zeroBalances },
        source: "RESET" as const,
        updatedAt: timestamp,
        updatedByActorId
      }));

      return dependencies.biasLedgerRepository.saveMany(resetLedgers);
    },
    async listWeekdayPairBiasLedgers(effectiveMonth) {
      return dependencies.weekdayPairBiasLedgerRepository.listByMonth(effectiveMonth);
    },
    async adjustWeekdayPairBias(input) {
      const existingLedger =
        await dependencies.weekdayPairBiasLedgerRepository.findByDoctorAndMonth(
          input.doctorId,
          input.effectiveMonth
        );

      const nextBalance = addWeekdayPairBiasBalances(
        existingLedger?.balance ?? createZeroWeekdayPairBiasBalance(),
        input.delta
      );

      void input.reason;

      return dependencies.weekdayPairBiasLedgerRepository.save({
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
    async resetDoctorWeekdayPairBias(doctorId, effectiveMonth, updatedByActorId) {
      const existingLedger =
        await dependencies.weekdayPairBiasLedgerRepository.findByDoctorAndMonth(
          doctorId,
          effectiveMonth
        );

      return dependencies.weekdayPairBiasLedgerRepository.save({
        id: existingLedger?.id ?? crypto.randomUUID(),
        doctorId,
        effectiveMonth,
        balance: createZeroWeekdayPairBiasBalance(),
        source: "RESET",
        sourceReferenceId: existingLedger?.sourceReferenceId,
        updatedAt: new Date().toISOString(),
        updatedByActorId
      });
    },
    async resetAllWeekdayPairBias(effectiveMonth, updatedByActorId) {
      const ledgers =
        await dependencies.weekdayPairBiasLedgerRepository.listByMonth(
          effectiveMonth
        );
      const timestamp = new Date().toISOString();

      const resetLedgers = ledgers.map((ledger) => ({
        ...ledger,
        balance: createZeroWeekdayPairBiasBalance(),
        source: "RESET" as const,
        updatedAt: timestamp,
        updatedByActorId
      }));

      return dependencies.weekdayPairBiasLedgerRepository.saveMany(resetLedgers);
    }
  };
}
