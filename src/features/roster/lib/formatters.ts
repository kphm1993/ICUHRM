import type {
  BiasBalance,
  EntityId,
  ISODateString,
  ISODateTimeString,
  WeekdayPairBiasBalance,
  YearMonthString
} from "@/domain/models";

export interface BiasDisplayEntry {
  readonly id: EntityId;
  readonly label: string;
  readonly value: number;
}

export function formatRosterMonth(rosterMonth: YearMonthString): string {
  return new Date(`${rosterMonth}-01T00:00:00.000Z`).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }
  );
}

export function formatRosterDate(date: ISODateString): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function formatDateTime(dateTime: ISODateTimeString): string {
  return new Date(dateTime).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatSignedValue(value: number): string {
  const roundedValue = Math.round(value * 100) / 100;
  if (roundedValue === 0) {
    return "0";
  }

  return roundedValue > 0 ? `+${roundedValue}` : `${roundedValue}`;
}

export function formatBiasBalance(balance: BiasBalance): string {
  return [
    `Weekday Day ${formatSignedValue(balance.weekdayDay)}`,
    `Weekday Night ${formatSignedValue(balance.weekdayNight)}`,
    `Weekend Day ${formatSignedValue(balance.weekendDay)}`,
    `Weekend Night ${formatSignedValue(balance.weekendNight)}`
  ].join(" • ");
}

export function formatBiasDisplayEntries(
  entries: ReadonlyArray<BiasDisplayEntry> | null
): string {
  if (!entries) {
    return "Not available";
  }

  if (entries.length === 0) {
    return "No criteria tracked";
  }

  const nonZeroEntries = entries
    .filter((entry) => entry.value !== 0)
    .map((entry) => `${entry.label} ${formatSignedValue(entry.value)}`);

  return nonZeroEntries.length > 0 ? nonZeroEntries.join(" | ") : "All zero";
}

export function formatWeekdayPairBiasBalance(
  balance: WeekdayPairBiasBalance | null
): string {
  if (!balance) {
    return "Not tracked";
  }

  const entries = [
    ["Mon D", balance.mondayDay] as const,
    ["Mon N", balance.mondayNight] as const,
    ["Tue D", balance.tuesdayDay] as const,
    ["Tue N", balance.tuesdayNight] as const,
    ["Wed D", balance.wednesdayDay] as const,
    ["Wed N", balance.wednesdayNight] as const,
    ["Thu D", balance.thursdayDay] as const,
    ["Thu N", balance.thursdayNight] as const,
    ["Fri D", balance.fridayDay] as const,
    ["Fri N", balance.fridayNight] as const
  ]
    .filter(([, value]) => value !== 0)
    .map(([label, value]) => `${label} ${formatSignedValue(value)}`);

  return entries.length > 0 ? entries.join(" • ") : "All zero";
}
