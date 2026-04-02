import type {
  BiasBalance,
  BiasLedger,
  EntityId,
  WeekdayPairBiasBalance,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";
import type {
  BiasLedgerRepository,
  WeekdayPairBiasLedgerRepository
} from "@/domain/repositories";

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

const EMPTY_BIAS_BALANCE: BiasBalance = {
  weekdayDay: 0,
  weekdayNight: 0,
  weekendDay: 0,
  weekendNight: 0
};

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
  readonly biasLedgerRepository: BiasLedgerRepository;
  readonly weekdayPairBiasLedgerRepository: WeekdayPairBiasLedgerRepository;
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
