import type {
  Assignment,
  Doctor,
  Leave,
  Shift,
  WeekendGroup,
  WeekendGroupScheduleEntry
} from "@/domain/models";
import {
  addDays,
  getWeekendStartDate,
  parseIsoDate,
  toIsoDate
} from "@/domain/scheduling/dateUtils";

function isDateWithinInclusive(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  return date >= startDate && date <= endDate;
}

export function findDoctorLeaveForShift(
  doctor: Pick<Doctor, "id">,
  shift: Pick<Shift, "date">,
  leaves: ReadonlyArray<Leave>
): Leave | null {
  return (
    leaves.find(
      (leave) =>
        leave.doctorId === doctor.id &&
        isDateWithinInclusive(shift.date, leave.startDate, leave.endDate)
    ) ?? null
  );
}

export function resolveWeekendOffGroupForShift(
  shift: Pick<Shift, "date" | "special" | "category">,
  weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>
): WeekendGroup | null {
  if (shift.category !== "WEEKEND" && shift.special !== "FRIDAY_NIGHT") {
    return null;
  }

  const weekendStartDate = getWeekendStartDate(
    shift.date,
    shift.special === "FRIDAY_NIGHT"
  );
  const weekendRule = weekendGroupSchedule.find(
    (entry) => entry.weekendStartDate === weekendStartDate
  );

  return weekendRule?.offGroup ?? null;
}

export function evaluateInactiveDoctorRule(
  doctor: Pick<Doctor, "isActive">
): string | null {
  return doctor.isActive ? null : "Doctor is inactive.";
}

export function evaluateLeaveRule(
  doctor: Pick<Doctor, "id">,
  shift: Pick<Shift, "date">,
  leaves: ReadonlyArray<Leave>
): string | null {
  return findDoctorLeaveForShift(doctor, shift, leaves)
    ? "Doctor is on leave for this shift date."
    : null;
}

export function evaluateWeekendGroupRule(
  doctor: Pick<Doctor, "weekendGroup">,
  shift: Pick<Shift, "date" | "category" | "special">,
  weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>
): string | null {
  if (shift.category !== "WEEKEND") {
    return null;
  }

  const offGroup = resolveWeekendOffGroupForShift(shift, weekendGroupSchedule);

  if (!offGroup) {
    return "Weekend group schedule is missing for this weekend shift.";
  }

  return doctor.weekendGroup === offGroup
    ? "Doctor belongs to the weekend-off group for this weekend shift."
    : null;
}

export function evaluateFridayNightRule(
  doctor: Pick<Doctor, "weekendGroup">,
  shift: Pick<Shift, "date" | "category" | "special">,
  weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>
): string | null {
  if (shift.special !== "FRIDAY_NIGHT") {
    return null;
  }

  const offGroup = resolveWeekendOffGroupForShift(shift, weekendGroupSchedule);

  if (!offGroup) {
    return "Weekend group schedule is missing for this Friday night shift.";
  }

  return doctor.weekendGroup === offGroup
    ? "Doctor belongs to the weekend-off group for this Friday night shift."
    : null;
}

export function evaluateOneShiftPerDayRule(
  doctor: Pick<Doctor, "id">,
  shift: Pick<Shift, "date" | "type">,
  assignments: ReadonlyArray<Pick<Assignment, "assignedDoctorId" | "shiftId">>,
  shiftsById: ReadonlyMap<string, Pick<Shift, "date" | "type">>
): string | null {
  if (shift.type !== "DAY" && shift.type !== "NIGHT") {
    return null;
  }

  const conflictingAssignment = assignments.find((assignment) => {
    if (assignment.assignedDoctorId !== doctor.id) {
      return false;
    }

    const assignedShift = shiftsById.get(assignment.shiftId);

    if (!assignedShift) {
      return false;
    }

    if (assignedShift.date !== shift.date) {
      return false;
    }

    if (assignedShift.type !== "DAY" && assignedShift.type !== "NIGHT") {
      return false;
    }

    return assignedShift.type !== shift.type;
  });

  if (!conflictingAssignment) {
    return null;
  }

  const conflictingShift = shiftsById.get(conflictingAssignment.shiftId);
  const conflictingShiftLabel =
    conflictingShift?.type === "DAY"
      ? "day"
      : conflictingShift?.type === "NIGHT"
        ? "night"
        : "same-day";

  return `Doctor already has a ${conflictingShiftLabel} shift assignment on ${shift.date}.`;
}

export function evaluateRestAfterNightShiftRule(
  doctor: Pick<Doctor, "id">,
  shift: Pick<Shift, "date" | "type">,
  assignments: ReadonlyArray<Pick<Assignment, "assignedDoctorId" | "shiftId">>,
  shiftsById: ReadonlyMap<string, Pick<Shift, "date" | "type">>
): string | null {
  if (shift.type !== "DAY" && shift.type !== "NIGHT") {
    return null;
  }

  const previousDate = toIsoDate(addDays(parseIsoDate(shift.date), -1));
  const previousNightAssignment = assignments.find((assignment) => {
    if (assignment.assignedDoctorId !== doctor.id) {
      return false;
    }

    const assignedShift = shiftsById.get(assignment.shiftId);

    if (!assignedShift) {
      return false;
    }

    return assignedShift.date === previousDate && assignedShift.type === "NIGHT";
  });

  if (!previousNightAssignment) {
    return null;
  }

  return `Doctor must rest on ${shift.date} after working a night shift on ${previousDate}.`;
}
