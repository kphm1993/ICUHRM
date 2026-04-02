import type {
  BiasBalance,
  Shift,
  WeekdayPairBiasBalance,
  WeekdayPairBiasBucket
} from "@/domain/models";
import { parseIsoDate } from "@/domain/scheduling/dateUtils";
import type {
  BiasBucket,
  BiasBucketCounts,
  WeekdayPairBiasBucketCounts
} from "@/domain/scheduling/contracts";

const EMPTY_BUCKET_COUNTS: BiasBucketCounts = {
  weekdayDay: 0,
  weekdayNight: 0,
  weekendDay: 0,
  weekendNight: 0
};

const EMPTY_WEEKDAY_PAIR_BUCKET_COUNTS: WeekdayPairBiasBucketCounts = {
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

export function createEmptyBiasBalance(): BiasBalance {
  return { ...EMPTY_BUCKET_COUNTS };
}

export function createEmptyBiasBucketCounts(): BiasBucketCounts {
  return { ...EMPTY_BUCKET_COUNTS };
}

export function createEmptyWeekdayPairBiasBalance(): WeekdayPairBiasBalance {
  return { ...EMPTY_WEEKDAY_PAIR_BUCKET_COUNTS };
}

export function createEmptyWeekdayPairBiasBucketCounts(): WeekdayPairBiasBucketCounts {
  return { ...EMPTY_WEEKDAY_PAIR_BUCKET_COUNTS };
}

export function resolveShiftBiasBucket(shift: Pick<Shift, "type" | "category" | "special">): BiasBucket | null {
  if (shift.special === "FRIDAY_NIGHT") {
    return "weekdayNight";
  }

  if (shift.type === "CUSTOM") {
    return null;
  }

  if (shift.category === "WEEKEND") {
    return shift.type === "DAY" ? "weekendDay" : "weekendNight";
  }

  return shift.type === "DAY" ? "weekdayDay" : "weekdayNight";
}

function resolveWeekdayPairPrefix(
  shift: Pick<Shift, "date" | "category" | "special">
): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | null {
  if (shift.category !== "WEEKDAY") {
    return null;
  }

  const dayOfWeek = parseIsoDate(shift.date).getUTCDay();

  switch (dayOfWeek) {
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    default:
      return null;
  }
}

export function resolveShiftWeekdayPairBiasBucket(
  shift: Pick<Shift, "date" | "type" | "category" | "special">
): WeekdayPairBiasBucket | null {
  if (shift.special === "FRIDAY_NIGHT") {
    return "fridayNight";
  }

  if (shift.category !== "WEEKDAY" || shift.type === "CUSTOM") {
    return null;
  }

  const prefix = resolveWeekdayPairPrefix(shift);

  if (!prefix) {
    return null;
  }

  return shift.type === "DAY"
    ? (`${prefix}Day` as WeekdayPairBiasBucket)
    : (`${prefix}Night` as WeekdayPairBiasBucket);
}

export function readBiasBucketValue(
  balance: BiasBalance,
  bucket: BiasBucket
): number {
  return balance[bucket];
}

export function readWeekdayPairBiasBucketValue(
  balance: WeekdayPairBiasBalance,
  bucket: WeekdayPairBiasBucket
): number {
  return balance[bucket];
}

export function writeBiasBucketValue(
  balance: BiasBalance,
  bucket: BiasBucket,
  value: number
): BiasBalance {
  return {
    ...balance,
    [bucket]: value
  };
}

export function writeWeekdayPairBiasBucketValue(
  balance: WeekdayPairBiasBalance,
  bucket: WeekdayPairBiasBucket,
  value: number
): WeekdayPairBiasBalance {
  return {
    ...balance,
    [bucket]: value
  };
}

export function roundBiasValue(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
