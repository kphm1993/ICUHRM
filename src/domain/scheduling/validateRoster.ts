import type { Assignment, Doctor, EntityId, Shift } from "@/domain/models";
import type { ValidateRosterInput, ValidationIssue, ValidationResult } from "@/domain/scheduling/contracts";
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

  return {
    isValid: issues.length === 0,
    issues
  };
}
