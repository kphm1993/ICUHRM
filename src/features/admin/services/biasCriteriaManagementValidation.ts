import type { DayOfWeek, EntityId } from "@/domain/models";

export interface BiasCriteriaFieldErrors {
  code?: string;
  label?: string;
  weekdayConditions?: string;
  isWeekendOnly?: string;
}

export class BiasCriteriaValidationError extends Error {
  readonly fieldErrors: BiasCriteriaFieldErrors;

  constructor(fieldErrors: BiasCriteriaFieldErrors) {
    super("Bias criteria validation failed.");
    this.name = "BiasCriteriaValidationError";
    this.fieldErrors = fieldErrors;
  }
}

const DAY_ORDER: ReadonlyArray<DayOfWeek> = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN"
];

function dedupeEntityIds(ids: ReadonlyArray<EntityId>): ReadonlyArray<EntityId> {
  return Array.from(new Set(ids));
}

function sortWeekdays(days: ReadonlyArray<DayOfWeek>): ReadonlyArray<DayOfWeek> {
  return [...new Set(days)].sort(
    (left, right) => DAY_ORDER.indexOf(left) - DAY_ORDER.indexOf(right)
  );
}

function hasWeekendDay(days: ReadonlyArray<DayOfWeek>): boolean {
  return days.includes("SAT") || days.includes("SUN");
}

export interface NormalizedBiasCriteriaInput {
  readonly code: string;
  readonly label: string;
  readonly locationIds: ReadonlyArray<EntityId>;
  readonly shiftTypeIds: ReadonlyArray<EntityId>;
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>;
  readonly isWeekendOnly: boolean;
}

export function validateBiasCriteriaInput(input: {
  readonly code: string;
  readonly label: string;
  readonly locationIds: ReadonlyArray<EntityId>;
  readonly shiftTypeIds: ReadonlyArray<EntityId>;
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>;
  readonly isWeekendOnly: boolean;
}): NormalizedBiasCriteriaInput {
  const code = input.code.trim().toUpperCase();
  const label = input.label.trim();
  const locationIds = dedupeEntityIds(input.locationIds);
  const shiftTypeIds = dedupeEntityIds(input.shiftTypeIds);
  const weekdayConditions = sortWeekdays(input.weekdayConditions);
  const fieldErrors: BiasCriteriaFieldErrors = {};

  if (code.length === 0) {
    fieldErrors.code = "Code is required.";
  } else if (code.length > 30) {
    fieldErrors.code = "Code must be 1-30 characters.";
  } else if (!/^[A-Z0-9_]+$/.test(code)) {
    fieldErrors.code = "Code must contain only uppercase letters, numbers, or underscores.";
  }

  if (label.length === 0) {
    fieldErrors.label = "Label is required.";
  } else if (label.length > 100) {
    fieldErrors.label = "Label must be 1-100 characters.";
  }

  if (input.isWeekendOnly && weekdayConditions.length === 0) {
    fieldErrors.weekdayConditions =
      "Select at least one weekend day before enabling weekend-only mode.";
  } else if (input.isWeekendOnly && !hasWeekendDay(weekdayConditions)) {
    fieldErrors.isWeekendOnly =
      "Weekend-only mode requires Saturday and/or Sunday in the selected days.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new BiasCriteriaValidationError(fieldErrors);
  }

  return {
    code,
    label,
    locationIds,
    shiftTypeIds,
    weekdayConditions,
    isWeekendOnly: input.isWeekendOnly
  };
}
