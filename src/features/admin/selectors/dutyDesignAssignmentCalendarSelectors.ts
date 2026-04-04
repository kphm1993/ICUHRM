import type {
  ISODateString,
  RosterPeriod,
  YearMonthString
} from "@/domain/models";

export interface DutyDesignAssignmentChipViewModel {
  readonly id: string;
  readonly dutyDesignId: string;
  readonly code: string;
  readonly label: string;
  readonly isHolidayOverride: boolean;
  readonly isActive: boolean;
}

export interface DutyDesignAssignmentCalendarDayViewModel {
  readonly date: ISODateString;
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isWeekend: boolean;
  readonly isSelected: boolean;
  readonly assignments: ReadonlyArray<DutyDesignAssignmentChipViewModel>;
}

export interface DutyDesignAssignmentCalendarWeekViewModel {
  readonly weekIndex: number;
  readonly days: ReadonlyArray<DutyDesignAssignmentCalendarDayViewModel>;
}

function getMonthDate(yearMonth: YearMonthString): Date {
  return new Date(`${yearMonth}-01T00:00:00.000Z`);
}

function toIsoDateString(date: Date): ISODateString {
  return date.toISOString().slice(0, 10) as ISODateString;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getMondayStart(date: Date): Date {
  const day = date.getUTCDay();
  const normalizedDay = day === 0 ? 7 : day;
  return addDays(date, 1 - normalizedDay);
}

function getSundayEnd(date: Date): Date {
  const day = date.getUTCDay();
  const normalizedDay = day === 0 ? 7 : day;
  return addDays(date, 7 - normalizedDay);
}

export function getDutyDesignAssignmentMonthPeriod(
  yearMonth: YearMonthString
): RosterPeriod {
  const monthStart = getMonthDate(yearMonth);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);

  return {
    startDate: toIsoDateString(monthStart),
    endDate: toIsoDateString(monthEnd)
  };
}

export function buildDutyDesignAssignmentCalendarWeeks(input: {
  readonly month: YearMonthString;
  readonly assignmentsByDate: Readonly<
    Record<string, ReadonlyArray<DutyDesignAssignmentChipViewModel>>
  >;
  readonly selectedDates: ReadonlySet<ISODateString>;
}): ReadonlyArray<DutyDesignAssignmentCalendarWeekViewModel> {
  const monthStart = getMonthDate(input.month);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  const gridStart = getMondayStart(monthStart);
  const gridEnd = getSundayEnd(monthEnd);
  const weeks: DutyDesignAssignmentCalendarWeekViewModel[] = [];
  let currentDate = gridStart;
  let weekIndex = 0;

  while (currentDate <= gridEnd) {
    const days: DutyDesignAssignmentCalendarDayViewModel[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(currentDate, offset);
      const isoDate = toIsoDateString(date);
      const dayOfWeek = date.getUTCDay();

      days.push({
        date: isoDate,
        dayNumber: date.getUTCDate(),
        isCurrentMonth: date.getUTCMonth() === monthStart.getUTCMonth(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSelected: input.selectedDates.has(isoDate),
        assignments: input.assignmentsByDate[isoDate] ?? []
      });
    }

    weeks.push({
      weekIndex,
      days
    });

    currentDate = addDays(currentDate, 7);
    weekIndex += 1;
  }

  return weeks;
}
