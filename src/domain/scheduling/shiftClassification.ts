import type { GroupEligibility, ISODateString, Shift, ShiftCategory, ShiftSpecialFlag, ShiftType } from "@/domain/models";
import { parseIsoDate } from "@/domain/scheduling/dateUtils";

function getDayOfWeek(date: ISODateString): number {
  return parseIsoDate(date).getUTCDay();
}

export function resolveShiftSpecialFlag(
  date: ISODateString,
  shiftType: ShiftType
): ShiftSpecialFlag {
  const dayOfWeek = getDayOfWeek(date);
  return dayOfWeek === 5 && shiftType.defaultKind === "NIGHT"
    ? "FRIDAY_NIGHT"
    : "NONE";
}

export function resolveShiftCategory(date: ISODateString): ShiftCategory {
  const dayOfWeek = getDayOfWeek(date);
  return dayOfWeek === 6 || dayOfWeek === 0 ? "WEEKEND" : "WEEKDAY";
}

export function isRestrictedShift(shift: Pick<Shift, "category" | "special">): boolean {
  return shift.category === "WEEKEND" || shift.special === "FRIDAY_NIGHT";
}

export function resolveGroupEligibility(
  category: ShiftCategory,
  special: ShiftSpecialFlag
): GroupEligibility {
  return category === "WEEKEND" || special === "FRIDAY_NIGHT"
    ? "NOT_WEEKEND_OFF_GROUP"
    : "ALL";
}

export function compareShiftsForAssignment(
  left: Pick<Shift, "category" | "special" | "date" | "startTime" | "definitionSnapshot">,
  right: Pick<Shift, "category" | "special" | "date" | "startTime" | "definitionSnapshot">
): number {
  const leftRestricted = isRestrictedShift(left) ? 0 : 1;
  const rightRestricted = isRestrictedShift(right) ? 0 : 1;

  if (leftRestricted !== rightRestricted) {
    return leftRestricted - rightRestricted;
  }

  const dateComparison = left.date.localeCompare(right.date);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  const startTimeComparison = left.startTime.localeCompare(right.startTime);
  if (startTimeComparison !== 0) {
    return startTimeComparison;
  }

  return left.definitionSnapshot.code.localeCompare(right.definitionSnapshot.code);
}
