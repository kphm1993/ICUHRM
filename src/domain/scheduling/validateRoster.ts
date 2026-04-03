import type { Assignment, Doctor, EntityId, Shift } from "@/domain/models";
import type { ValidateRosterInput, ValidationIssue, ValidationResult } from "@/domain/scheduling/contracts";
import { addDays, parseIsoDate, toIsoDate } from "@/domain/scheduling/dateUtils";
import {
  evaluateLeaveRule,
  resolveWeekendOffGroupForShift
} from "@/domain/scheduling/eligibilityRules";

function getDoctorById(
  doctors: ReadonlyArray<Doctor>,
  doctorId: EntityId
): Doctor | null {
  return doctors.find((doctor) => doctor.id === doctorId) ?? null;
}

function getAssignmentDoctorId(assignment: Assignment): EntityId {
  return assignment.assignedDoctorId;
}

function addMissingWeekendScheduleIssue(
  issues: ValidationIssue[],
  shift: Shift,
  input: ValidateRosterInput
): void {
  if (shift.category !== "WEEKEND" && shift.special !== "FRIDAY_NIGHT") {
    return;
  }

  const weekendOffGroup = resolveWeekendOffGroupForShift(
    shift,
    input.weekendGroupSchedule
  );

  if (!weekendOffGroup) {
    issues.push({
      code: "MISSING_WEEKEND_GROUP_SCHEDULE",
      message: `Shift ${shift.id} requires weekend-group restriction data but no schedule entry was found.`,
      shiftId: shift.id
    });
  }
}

export function validateGeneratedRoster(
  input: ValidateRosterInput
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const assignmentsPerShift = new Map<string, number>();
  const assignmentsByShift = new Map<string, Assignment[]>();
  const shiftsById = new Map(input.shifts.map((shift) => [shift.id, shift] as const));
  const activeLocationIds = new Set(
    input.activeDutyLocations.map((location) => location.id)
  );
  const activeCriteriaIds = new Set(
    input.activeBiasCriteria.map((criteria) => criteria.id)
  );

  for (const assignment of input.assignments) {
    const currentCount = assignmentsPerShift.get(assignment.shiftId) ?? 0;
    assignmentsPerShift.set(assignment.shiftId, currentCount + 1);
    assignmentsByShift.set(assignment.shiftId, [
      ...(assignmentsByShift.get(assignment.shiftId) ?? []),
      assignment
    ]);

    if (!assignment.assignedDoctorId || !assignment.actualDoctorId) {
      issues.push({
        code: "SHIFT_UNASSIGNED",
        message: `Assignment ${assignment.id} is missing doctor ownership.`,
        assignmentId: assignment.id,
        shiftId: assignment.shiftId
      });
    }

    if (!assignment.fairnessOwnerDoctorId) {
      issues.push({
        code: "SHIFT_UNASSIGNED",
        message: `Assignment ${assignment.id} is missing fairness ownership.`,
        assignmentId: assignment.id,
        shiftId: assignment.shiftId
      });
    }
  }

  for (const shift of input.shifts) {
    const shiftAssignmentCount = assignmentsPerShift.get(shift.id) ?? 0;
    addMissingWeekendScheduleIssue(issues, shift, input);

    if (!activeLocationIds.has(shift.locationId)) {
      issues.push({
        code: "SHIFT_LOCATION_INVALID",
        message: `Shift ${shift.id} references duty location ${shift.locationId}, which is not part of the active generation snapshot.`,
        shiftId: shift.id
      });
    }

    if (shiftAssignmentCount === 0) {
      issues.push({
        code: "SHIFT_UNASSIGNED",
        message: `Shift ${shift.id} has no assignment.`,
        shiftId: shift.id
      });
      continue;
    }

    if (shiftAssignmentCount > 1) {
      issues.push({
        code: "SHIFT_MULTI_ASSIGNED",
        message: `Shift ${shift.id} has multiple assignments.`,
        shiftId: shift.id
      });
    }

    const shiftAssignments = assignmentsByShift.get(shift.id) ?? [];
    const weekendOffGroup = resolveWeekendOffGroupForShift(
      shift,
      input.weekendGroupSchedule
    );

    for (const assignment of shiftAssignments) {
      const doctor = getDoctorById(input.doctors, getAssignmentDoctorId(assignment));

      if (!doctor) {
        continue;
      }

      if (evaluateLeaveRule(doctor, shift, input.leaves)) {
        issues.push({
          code: "ASSIGNMENT_ON_LEAVE",
          message: `Doctor ${doctor.id} is assigned to shift ${shift.id} while on leave.`,
          shiftId: shift.id,
          assignmentId: assignment.id,
          doctorId: doctor.id
        });
      }

      if (
        shift.category === "WEEKEND" &&
        weekendOffGroup &&
        doctor.weekendGroup === weekendOffGroup
      ) {
        issues.push({
          code: "ASSIGNMENT_WEEKEND_OFF_GROUP",
          message: `Doctor ${doctor.id} belongs to the weekend-off group for weekend shift ${shift.id}.`,
          shiftId: shift.id,
          assignmentId: assignment.id,
          doctorId: doctor.id
        });
      }

      if (
        shift.special === "FRIDAY_NIGHT" &&
        weekendOffGroup &&
        doctor.weekendGroup === weekendOffGroup
      ) {
        issues.push({
          code: "ASSIGNMENT_FRIDAY_NIGHT_OFF_GROUP",
          message: `Doctor ${doctor.id} belongs to the weekend-off group for Friday night shift ${shift.id}.`,
          shiftId: shift.id,
          assignmentId: assignment.id,
          doctorId: doctor.id
        });
      }
    }
  }

  for (const ledger of input.updatedBias) {
    for (const criteriaId of Object.keys(ledger.balances)) {
      if (activeCriteriaIds.has(criteriaId)) {
        continue;
      }

      issues.push({
        code: "BIAS_LEDGER_UNKNOWN_CRITERIA",
        message: `Updated bias ledger ${ledger.id} for doctor ${ledger.doctorId} references unknown criteria ${criteriaId}.`,
        doctorId: ledger.doctorId
      });
    }
  }

  const assignmentsByDoctorDate = new Map<
    string,
    {
      readonly doctorId: EntityId;
      readonly date: string;
      dayAssignment?: Assignment;
      nightAssignment?: Assignment;
      dayShift?: Shift;
      nightShift?: Shift;
    }
  >();

  for (const assignment of input.assignments) {
    const shift = shiftsById.get(assignment.shiftId);

    if (!shift || (shift.type !== "DAY" && shift.type !== "NIGHT")) {
      continue;
    }

    const doctorId = getAssignmentDoctorId(assignment);
    const key = `${doctorId}:${shift.date}`;
    const existingEntry = assignmentsByDoctorDate.get(key) ?? {
      doctorId,
      date: shift.date
    };

    if (shift.type === "DAY") {
      existingEntry.dayAssignment = assignment;
      existingEntry.dayShift = shift;
    }

    if (shift.type === "NIGHT") {
      existingEntry.nightAssignment = assignment;
      existingEntry.nightShift = shift;
    }

    assignmentsByDoctorDate.set(key, existingEntry);
  }

  for (const entry of assignmentsByDoctorDate.values()) {
    if (
      !entry.dayAssignment ||
      !entry.nightAssignment ||
      !entry.dayShift ||
      !entry.nightShift
    ) {
      continue;
    }

    issues.push({
      code: "ASSIGNMENT_SAME_DAY_CONFLICT",
      message: `Doctor ${entry.doctorId} is assigned to both ${entry.dayShift.id} and ${entry.nightShift.id} on ${entry.date}. Assignments ${entry.dayAssignment.id} and ${entry.nightAssignment.id} violate the one-shift-per-day rule.`,
      doctorId: entry.doctorId
    });
  }

  const dayNightAssignmentsByDoctorDate = new Map<
    string,
    {
      readonly doctorId: EntityId;
      readonly date: string;
      readonly entries: ReadonlyArray<{
        readonly assignment: Assignment;
        readonly shift: Shift;
      }>;
    }
  >();

  for (const assignment of input.assignments) {
    const shift = shiftsById.get(assignment.shiftId);

    if (!shift || (shift.type !== "DAY" && shift.type !== "NIGHT")) {
      continue;
    }

    const doctorId = getAssignmentDoctorId(assignment);
    const key = `${doctorId}:${shift.date}`;
    const currentEntry = dayNightAssignmentsByDoctorDate.get(key);
    const nextEntries = [
      ...(currentEntry?.entries ?? []),
      {
        assignment,
        shift
      }
    ];

    dayNightAssignmentsByDoctorDate.set(key, {
      doctorId,
      date: shift.date,
      entries: nextEntries
    });
  }

  const sortedDoctorDateEntries = [...dayNightAssignmentsByDoctorDate.values()].sort(
    (left, right) => {
      const doctorComparison = left.doctorId.localeCompare(right.doctorId);
      return doctorComparison !== 0
        ? doctorComparison
        : left.date.localeCompare(right.date);
    }
  );

  for (const entry of sortedDoctorDateEntries) {
    const hasNightShift = entry.entries.some(
      (currentEntry) => currentEntry.shift.type === "NIGHT"
    );

    if (!hasNightShift) {
      continue;
    }

    const nextDate = toIsoDate(addDays(parseIsoDate(entry.date), 1));
    const nextDayEntry = dayNightAssignmentsByDoctorDate.get(
      `${entry.doctorId}:${nextDate}`
    );

    if (!nextDayEntry) {
      continue;
    }

    for (const violatingEntry of nextDayEntry.entries) {
      issues.push({
        code: "ASSIGNMENT_REST_AFTER_NIGHT_VIOLATION",
        message: `Doctor ${entry.doctorId} is assigned to shift ${violatingEntry.shift.id} on ${nextDate} after working a night shift on ${entry.date}.`,
        shiftId: violatingEntry.shift.id,
        assignmentId: violatingEntry.assignment.id,
        doctorId: entry.doctorId
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
