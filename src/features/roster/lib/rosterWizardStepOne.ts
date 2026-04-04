import type {
  ISODateString,
  RosterPeriod,
  YearMonthString
} from "@/domain/models";
import { enumerateDates } from "@/domain/scheduling/dateUtils";
import { getRosterMonthRange } from "@/features/roster/services/weekendGroupScheduleService";

export interface RosterWizardStepOneState {
  readonly rosterMonth: YearMonthString;
  readonly isCustomRangeEnabled: boolean;
  readonly customRange: {
    readonly startDate: string;
    readonly endDate: string;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
}

export interface RosterWizardValidatedStepOneDraft {
  readonly rosterMonth: YearMonthString;
  readonly customRange?: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly effectiveRange: RosterPeriod;
}

function toYearMonthString(date: ISODateString): YearMonthString {
  return date.slice(0, 7) as YearMonthString;
}

function rangesOverlap(left: RosterPeriod, right: RosterPeriod): boolean {
  return left.startDate <= right.endDate && left.endDate >= right.startDate;
}

export function normalizeRosterWizardHolidayDates(
  publicHolidayDates: ReadonlyArray<ISODateString>
): ReadonlyArray<ISODateString> {
  return [...new Set(publicHolidayDates)].sort();
}

export function getRosterWizardStepOneFullMonthRange(
  rosterMonth: YearMonthString
): RosterPeriod {
  return getRosterMonthRange(rosterMonth);
}

export function resolveRosterWizardEffectiveRange(input: {
  readonly rosterMonth: YearMonthString;
  readonly customRange?: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
}): RosterPeriod {
  return input.customRange
    ? {
        startDate: input.customRange.startDate,
        endDate: input.customRange.endDate
      }
    : getRosterWizardStepOneFullMonthRange(input.rosterMonth);
}

export function listRosterWizardMonthsInRange(
  range: RosterPeriod
): ReadonlyArray<YearMonthString> {
  const months: YearMonthString[] = [];
  let cursor = `${range.startDate.slice(0, 7)}-01T00:00:00.000Z`;
  const endMonth = toYearMonthString(range.endDate);

  while ((cursor.slice(0, 7) as YearMonthString) <= endMonth) {
    const month = cursor.slice(0, 7) as YearMonthString;
    months.push(month);

    const nextMonth = new Date(cursor);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    nextMonth.setUTCDate(1);
    cursor = nextMonth.toISOString();
  }

  return months;
}

export function isDateWithinRosterWizardRange(
  date: ISODateString,
  range: RosterPeriod
): boolean {
  return date >= range.startDate && date <= range.endDate;
}

export function filterRosterWizardHolidayDatesToRange(
  publicHolidayDates: ReadonlyArray<ISODateString>,
  range: RosterPeriod
): ReadonlyArray<ISODateString> {
  return normalizeRosterWizardHolidayDates(publicHolidayDates).filter((date) =>
    isDateWithinRosterWizardRange(date, range)
  );
}

export function buildRosterWizardStepOneState(input: {
  readonly rosterMonth: YearMonthString;
  readonly customRange?: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
}): RosterWizardStepOneState {
  const fullMonthRange = getRosterWizardStepOneFullMonthRange(input.rosterMonth);

  return {
    rosterMonth: input.rosterMonth,
    isCustomRangeEnabled: input.customRange !== undefined,
    customRange: {
      startDate: input.customRange?.startDate ?? fullMonthRange.startDate,
      endDate: input.customRange?.endDate ?? fullMonthRange.endDate
    },
    publicHolidayDates: normalizeRosterWizardHolidayDates(input.publicHolidayDates)
  };
}

export function getRosterWizardStepOneViewRange(
  state: Pick<
    RosterWizardStepOneState,
    "rosterMonth" | "isCustomRangeEnabled" | "customRange"
  >
): RosterPeriod {
  const fullMonthRange = getRosterWizardStepOneFullMonthRange(state.rosterMonth);

  if (
    !state.isCustomRangeEnabled ||
    !state.customRange.startDate ||
    !state.customRange.endDate
  ) {
    return fullMonthRange;
  }

  if (state.customRange.startDate > state.customRange.endDate) {
    return fullMonthRange;
  }

  const customRange = {
    startDate: state.customRange.startDate as ISODateString,
    endDate: state.customRange.endDate as ISODateString
  };

  return rangesOverlap(customRange, fullMonthRange) ? customRange : fullMonthRange;
}

export function getRosterWizardStepOneValidationMessage(
  state: Pick<
    RosterWizardStepOneState,
    "rosterMonth" | "isCustomRangeEnabled" | "customRange"
  >
): string | null {
  if (!state.isCustomRangeEnabled) {
    return null;
  }

  if (!state.customRange.startDate || !state.customRange.endDate) {
    return "Choose both a custom start date and end date.";
  }

  if (state.customRange.startDate > state.customRange.endDate) {
    return "Custom range end date must be on or after the start date.";
  }

  const fullMonthRange = getRosterWizardStepOneFullMonthRange(state.rosterMonth);
  const customRange = {
    startDate: state.customRange.startDate as ISODateString,
    endDate: state.customRange.endDate as ISODateString
  };

  return rangesOverlap(customRange, fullMonthRange)
    ? null
    : `Custom range must include at least one date from roster month '${state.rosterMonth}'.`;
}

export function validateRosterWizardStepOneDraft(input: {
  readonly rosterMonth: YearMonthString;
  readonly customRange?: {
    readonly startDate: ISODateString;
    readonly endDate: ISODateString;
  };
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
}): RosterWizardValidatedStepOneDraft {
  const fullMonthRange = getRosterWizardStepOneFullMonthRange(input.rosterMonth);
  const normalizedHolidayDates = normalizeRosterWizardHolidayDates(input.publicHolidayDates);

  if (!input.customRange) {
    const invalidHolidayDate = normalizedHolidayDates.find(
      (date) => !isDateWithinRosterWizardRange(date, fullMonthRange)
    );

    if (invalidHolidayDate) {
      throw new Error(
        `Public holiday date '${invalidHolidayDate}' must fall within the selected roster range.`
      );
    }

    return {
      rosterMonth: input.rosterMonth,
      publicHolidayDates: normalizedHolidayDates,
      effectiveRange: fullMonthRange
    };
  }

  if (!input.customRange.startDate || !input.customRange.endDate) {
    throw new Error("Custom range requires both a start date and an end date.");
  }

  if (input.customRange.startDate > input.customRange.endDate) {
    throw new Error("Custom range end date must be on or after the start date.");
  }

  if (!rangesOverlap(input.customRange, fullMonthRange)) {
    throw new Error(
      `Custom range must include at least one date from roster month '${input.rosterMonth}'.`
    );
  }

  const invalidHolidayDate = normalizedHolidayDates.find(
    (date) => !isDateWithinRosterWizardRange(date, input.customRange!)
  );

  if (invalidHolidayDate) {
    throw new Error(
      `Public holiday date '${invalidHolidayDate}' must fall within the selected roster range.`
    );
  }

  return {
    rosterMonth: input.rosterMonth,
    customRange: {
      startDate: input.customRange.startDate,
      endDate: input.customRange.endDate
    },
    publicHolidayDates: normalizedHolidayDates,
    effectiveRange: resolveRosterWizardEffectiveRange(input)
  };
}

export function countRosterWizardDaysInRange(range: RosterPeriod): number {
  return enumerateDates(range.startDate, range.endDate).length;
}
