import type {
  CheckEligibilityInput,
  EligibilityDecision
} from "@/domain/scheduling/contracts";
import {
  evaluateFridayNightRule,
  evaluateInactiveDoctorRule,
  evaluateLeaveRule,
  evaluateWeekendGroupRule
} from "@/domain/scheduling/eligibilityRules";

export function checkShiftEligibility(
  input: CheckEligibilityInput
): ReadonlyArray<EligibilityDecision> {
  return input.doctors.map((doctor) => {
    const reasons: string[] = [];

    const inactiveReason = evaluateInactiveDoctorRule(doctor);
    if (inactiveReason) {
      reasons.push(inactiveReason);
    }

    const leaveReason = evaluateLeaveRule(doctor, input.shift, input.leaves);
    if (leaveReason) {
      reasons.push(leaveReason);
    }

    const weekendReason = evaluateWeekendGroupRule(
      doctor,
      input.shift,
      input.weekendGroupSchedule
    );
    if (weekendReason) {
      reasons.push(weekendReason);
    }

    const fridayNightReason = evaluateFridayNightRule(
      doctor,
      input.shift,
      input.weekendGroupSchedule
    );
    if (fridayNightReason) {
      reasons.push(fridayNightReason);
    }

    // TODO: Add one-shift-per-day, consecutive-duty, and operational override rules.
    return {
      doctorId: doctor.id,
      isEligible: reasons.length === 0,
      reasons
    };
  });
}
