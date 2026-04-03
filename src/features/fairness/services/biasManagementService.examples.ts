import type {
  BiasCriteria,
  BiasLedger,
  WeekdayPairBiasLedger,
  YearMonthString
} from "@/domain/models";
import { createBiasManagementService } from "@/features/fairness/services/biasManagementService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryWeekdayPairBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";

const EXAMPLE_EFFECTIVE_MONTH = "2026-04" as YearMonthString;

const EXAMPLE_BIAS_CRITERIA: ReadonlyArray<BiasCriteria> = [
  {
    id: "criteria-weekend-night",
    code: "WEEKEND_NIGHT",
    label: "Weekend Night",
    locationIds: [],
    shiftTypeIds: ["shift-type-night"],
    weekdayConditions: ["SAT", "SUN"],
    isWeekendOnly: true,
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    createdByActorId: "user-admin-demo",
    updatedByActorId: "user-admin-demo"
  }
];

const EXAMPLE_PRIMARY_BIAS_LEDGER: ReadonlyArray<BiasLedger> = [
  {
    id: "bias-doctor-a",
    doctorId: "doctor-a",
    effectiveMonth: EXAMPLE_EFFECTIVE_MONTH,
    balances: {
      "criteria-weekend-night": 1
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "roster-2026-03",
    updatedAt: "2026-03-31T23:59:00.000Z",
    updatedByActorId: "system"
  }
];

const EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER: ReadonlyArray<WeekdayPairBiasLedger> = [
  {
    id: "weekday-pair-bias-doctor-a",
    doctorId: "doctor-a",
    effectiveMonth: EXAMPLE_EFFECTIVE_MONTH,
    balance: {
      mondayDay: 0,
      mondayNight: 1,
      tuesdayDay: 0,
      tuesdayNight: 0,
      wednesdayDay: 0,
      wednesdayNight: 0,
      thursdayDay: 0,
      thursdayNight: 0,
      fridayDay: 0,
      fridayNight: 0
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "roster-2026-03",
    updatedAt: "2026-03-31T23:59:00.000Z",
    updatedByActorId: "system"
  },
  {
    id: "weekday-pair-bias-doctor-b",
    doctorId: "doctor-b",
    effectiveMonth: EXAMPLE_EFFECTIVE_MONTH,
    balance: {
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
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "roster-2026-03",
    updatedAt: "2026-03-31T23:59:00.000Z",
    updatedByActorId: "system"
  }
];

function createExampleBiasManagementService() {
  return createBiasManagementService({
    biasCriteriaRepository: new InMemoryBiasCriteriaRepository(EXAMPLE_BIAS_CRITERIA),
    biasLedgerRepository: new InMemoryBiasLedgerRepository(
      EXAMPLE_PRIMARY_BIAS_LEDGER
    ),
    weekdayPairBiasLedgerRepository: new InMemoryWeekdayPairBiasLedgerRepository(
      EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER
    )
  });
}

export async function runWeekdayPairBiasRepositoryExample() {
  const repository = new InMemoryWeekdayPairBiasLedgerRepository([
    EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER[0]
  ]);

  const saved = await repository.save(EXAMPLE_WEEKDAY_PAIR_BIAS_LEDGER[1]);
  const found = await repository.findByDoctorAndMonth(
    "doctor-b",
    EXAMPLE_EFFECTIVE_MONTH
  );
  const listed = await repository.listByMonth(EXAMPLE_EFFECTIVE_MONTH);

  return {
    saved,
    found,
    listed
  };
}

export async function runWeekdayPairBiasServiceExamples() {
  const service = createExampleBiasManagementService();
  const adjusted = await service.adjustWeekdayPairBias({
    doctorId: "doctor-a",
    effectiveMonth: EXAMPLE_EFFECTIVE_MONTH,
    delta: {
      mondayDay: -1,
      mondayNight: 0,
      tuesdayDay: 0,
      tuesdayNight: 0,
      wednesdayDay: 0,
      wednesdayNight: 0,
      thursdayDay: 0,
      thursdayNight: 0,
      fridayDay: 0,
      fridayNight: 1
    },
    reason: "Example manual correction",
    updatedByActorId: "admin-user"
  });

  const resetDoctor = await service.resetDoctorWeekdayPairBias(
    "doctor-a",
    EXAMPLE_EFFECTIVE_MONTH,
    "admin-user"
  );

  const resetAll = await service.resetAllWeekdayPairBias(
    EXAMPLE_EFFECTIVE_MONTH,
    "admin-user"
  );

  return {
    adjusted,
    resetDoctor,
    resetAll
  };
}
