import {
  LEGACY_PRIMARY_BIAS_CRITERION_IDS,
  type EntityId,
  type BiasBalance,
  type BiasLedgerBalances
} from "@/domain/models";

export function createEmptyBiasBalance(): BiasBalance {
  return {
    weekdayDay: 0,
    weekdayNight: 0,
    weekendDay: 0,
    weekendNight: 0
  };
}

export function createEmptyBiasLedgerBalances(): BiasLedgerBalances {
  return {};
}

export function roundBiasValue(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function readLegacyBiasBalance(
  balances: Readonly<Record<EntityId, number>> | null | undefined
): BiasBalance {
  return {
    weekdayDay: balances?.weekdayDay ?? 0,
    weekdayNight: balances?.weekdayNight ?? 0,
    weekendDay: balances?.weekendDay ?? 0,
    weekendNight: balances?.weekendNight ?? 0
  };
}

export function toBiasLedgerBalances(balance: BiasBalance): BiasLedgerBalances {
  const nextBalances: Record<EntityId, number> = {};

  for (const criterionId of LEGACY_PRIMARY_BIAS_CRITERION_IDS) {
    nextBalances[criterionId] = balance[criterionId];
  }

  return nextBalances;
}
