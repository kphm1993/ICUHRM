import type { ValidateRosterInput, ValidationResult } from "@/domain/scheduling/contracts";

export function validateGeneratedRoster(
  input: ValidateRosterInput
): ValidationResult {
  const errors: string[] = [];
  const assignmentsPerShift = new Map<string, number>();

  for (const assignment of input.assignments) {
    const currentCount = assignmentsPerShift.get(assignment.shiftId) ?? 0;
    assignmentsPerShift.set(assignment.shiftId, currentCount + 1);

    if (!assignment.assignedDoctorId || !assignment.actualDoctorId) {
      errors.push(`Assignment ${assignment.id} is missing doctor ownership.`);
    }

    if (!assignment.fairnessOwnerDoctorId) {
      errors.push(`Assignment ${assignment.id} is missing fairness ownership.`);
    }
  }

  for (const shift of input.shifts) {
    const shiftAssignmentCount = assignmentsPerShift.get(shift.id) ?? 0;

    if (shiftAssignmentCount > 1) {
      errors.push(`Shift ${shift.id} has multiple assignments.`);
    }
  }

  if (input.shifts.length > 0 && input.assignments.length === 0) {
    errors.push("Roster generation scaffold created shifts but no assignments yet.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

