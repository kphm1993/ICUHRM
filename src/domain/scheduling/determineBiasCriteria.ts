import type {
  BiasCriteria,
  DayOfWeek,
  DutyLocation,
  Shift,
  ShiftType
} from "@/domain/models";
import { parseIsoDate } from "@/domain/scheduling/dateUtils";

const DAY_OF_WEEK_BY_INDEX: ReadonlyArray<DayOfWeek> = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT"
];

export function getDayOfWeekFromDate(date: string): DayOfWeek {
  return DAY_OF_WEEK_BY_INDEX[parseIsoDate(date).getUTCDay()];
}

export function determineBiasCriteriaForShift(input: {
  readonly shift: Shift;
  readonly shiftType: ShiftType;
  readonly location: DutyLocation;
  readonly activeCriteria: ReadonlyArray<BiasCriteria>;
}): ReadonlyArray<BiasCriteria> {
  const dayOfWeek = getDayOfWeekFromDate(input.shift.date);
  const isWeekend = dayOfWeek === "SAT" || dayOfWeek === "SUN";

  return input.activeCriteria.filter((criteria) => {
    if (
      criteria.locationIds.length > 0 &&
      !criteria.locationIds.includes(input.location.id)
    ) {
      return false;
    }

    if (
      criteria.shiftTypeIds.length > 0 &&
      !criteria.shiftTypeIds.includes(input.shiftType.id)
    ) {
      return false;
    }

    if (
      criteria.weekdayConditions.length > 0 &&
      !criteria.weekdayConditions.includes(dayOfWeek)
    ) {
      return false;
    }

    if (criteria.isWeekendOnly && !isWeekend) {
      return false;
    }

    return true;
  });
}
