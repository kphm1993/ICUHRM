import type { BiasCriteria, DayOfWeek, DutyLocation, ShiftType } from "@/domain/models";

const DAY_ORDER: ReadonlyArray<DayOfWeek> = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN"
];

const WEEKDAY_LABELS: Readonly<Record<DayOfWeek, string>> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun"
};

export interface BiasCriteriaPreviewInput {
  readonly locationIds: ReadonlyArray<string>;
  readonly shiftTypeIds: ReadonlyArray<string>;
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>;
  readonly isWeekendOnly: boolean;
}

function summarizeLocations(
  locationIds: ReadonlyArray<string>,
  locations: ReadonlyArray<DutyLocation>
): string {
  if (locationIds.length === 0) {
    return "all locations";
  }

  const selectedLocations = locationIds
    .map((locationId) => locations.find((location) => location.id === locationId))
    .filter((location): location is DutyLocation => location !== undefined);

  if (selectedLocations.length === 0) {
    return "selected locations";
  }

  return selectedLocations.map((location) => location.code).join(", ");
}

function summarizeShiftTypes(
  shiftTypeIds: ReadonlyArray<string>,
  shiftTypes: ReadonlyArray<ShiftType>
): string {
  if (shiftTypeIds.length === 0) {
    return "all shift types";
  }

  const selectedShiftTypes = shiftTypeIds
    .map((shiftTypeId) => shiftTypes.find((shiftType) => shiftType.id === shiftTypeId))
    .filter((shiftType): shiftType is ShiftType => shiftType !== undefined);

  if (selectedShiftTypes.length === 0) {
    return "selected shift types";
  }

  return selectedShiftTypes.map((shiftType) => shiftType.code).join(", ");
}

function summarizeWeekdays(weekdayConditions: ReadonlyArray<DayOfWeek>): string {
  if (weekdayConditions.length === 0) {
    return "all days";
  }

  const orderedDays = [...new Set(weekdayConditions)].sort(
    (left, right) => DAY_ORDER.indexOf(left) - DAY_ORDER.indexOf(right)
  );

  if (
    orderedDays.length === 2 &&
    orderedDays.includes("SAT") &&
    orderedDays.includes("SUN")
  ) {
    return "weekends";
  }

  if (
    orderedDays.length === 5 &&
    DAY_ORDER.slice(0, 5).every((day) => orderedDays.includes(day))
  ) {
    return "weekdays";
  }

  return orderedDays.map((day) => WEEKDAY_LABELS[day]).join(", ");
}

export function buildBiasCriteriaPreview(
  input: BiasCriteriaPreviewInput,
  dependencies: {
    readonly locations: ReadonlyArray<DutyLocation>;
    readonly shiftTypes: ReadonlyArray<ShiftType>;
  }
): string {
  const locationSummary = summarizeLocations(input.locationIds, dependencies.locations);
  const shiftTypeSummary = summarizeShiftTypes(
    input.shiftTypeIds,
    dependencies.shiftTypes
  );
  const weekdaySummary = summarizeWeekdays(input.weekdayConditions);

  return `${locationSummary}; ${shiftTypeSummary}; ${weekdaySummary}${input.isWeekendOnly ? "; weekend-only" : ""}.`;
}

export function summarizeBiasCriteria(
  criteria: Pick<
    BiasCriteria,
    "locationIds" | "shiftTypeIds" | "weekdayConditions" | "isWeekendOnly"
  >,
  dependencies: {
    readonly locations: ReadonlyArray<DutyLocation>;
    readonly shiftTypes: ReadonlyArray<ShiftType>;
  }
): string {
  return buildBiasCriteriaPreview(criteria, dependencies);
}
