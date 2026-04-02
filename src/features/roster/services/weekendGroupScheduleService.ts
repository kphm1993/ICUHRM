import type {
  ISODateString,
  RosterPeriod,
  WeekendGroup,
  WeekendGroupScheduleEntry,
  YearMonthString
} from "@/domain/models";
import { enumerateDates, parseIsoDate } from "@/domain/scheduling/dateUtils";

function toIsoDateFromYearMonthDay(
  rosterMonth: YearMonthString,
  day: string
): ISODateString {
  return `${rosterMonth}-${day}` as ISODateString;
}

export function getRosterMonthRange(rosterMonth: YearMonthString): RosterPeriod {
  const startDate = toIsoDateFromYearMonthDay(rosterMonth, "01");
  const startDateObject = new Date(`${startDate}T00:00:00.000Z`);
  const nextMonthStartDate = new Date(startDateObject);
  nextMonthStartDate.setUTCMonth(nextMonthStartDate.getUTCMonth() + 1);
  nextMonthStartDate.setUTCDate(1);
  const endDate = new Date(nextMonthStartDate);
  endDate.setUTCDate(0);

  return {
    startDate,
    endDate: endDate.toISOString().slice(0, 10) as ISODateString
  };
}

export function buildWeekendGroupScheduleForMonth(
  rosterMonth: YearMonthString,
  firstWeekendOffGroup: WeekendGroup
): ReadonlyArray<WeekendGroupScheduleEntry> {
  const range = getRosterMonthRange(rosterMonth);
  const saturdayDates = enumerateDates(range.startDate, range.endDate).filter((date) => {
    return parseIsoDate(date).getUTCDay() === 6;
  });

  return saturdayDates.map((weekendStartDate, index) => ({
    weekendStartDate,
    offGroup:
      index % 2 === 0
        ? firstWeekendOffGroup
        : firstWeekendOffGroup === "A"
          ? "B"
          : "A"
  }));
}
