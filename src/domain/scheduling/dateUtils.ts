import type { ISODateString } from "@/domain/models";

export function parseIsoDate(date: ISODateString): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function toIsoDate(date: Date): ISODateString {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function enumerateDates(
  startDate: ISODateString,
  endDate: ISODateString
): ReadonlyArray<ISODateString> {
  const dates: ISODateString[] = [];
  let cursor = parseIsoDate(startDate);
  const lastDate = parseIsoDate(endDate);

  while (cursor <= lastDate) {
    dates.push(toIsoDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function getWeekendStartDate(
  date: ISODateString,
  treatAsUpcomingWeekend = false
): ISODateString {
  const parsedDate = parseIsoDate(date);
  const dayOfWeek = parsedDate.getUTCDay();

  if (treatAsUpcomingWeekend) {
    return toIsoDate(addDays(parsedDate, 1));
  }

  if (dayOfWeek === 6) {
    return date;
  }

  if (dayOfWeek === 0) {
    return toIsoDate(addDays(parsedDate, -1));
  }

  return toIsoDate(addDays(parsedDate, 6 - dayOfWeek));
}

