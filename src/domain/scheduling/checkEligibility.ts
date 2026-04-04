import type {
  CheckEligibilityInput,
  EligibilityDecision
} from "@/domain/scheduling/contracts";
import {
  evaluateAllowedDoctorGroupRule,
  evaluateDutyDesignBlockedDayRule,
  evaluateInactiveDoctorRule,
  evaluateLeaveRule,
  evaluateOneShiftPerDayRule,
  evaluateRestAfterNightShiftRule
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

    const blockedDayReason = evaluateDutyDesignBlockedDayRule(
      doctor,
      input.shift,
      input.blockedDatesByDoctorId
    );
    if (blockedDayReason) {
      reasons.push(blockedDayReason);
    }

    const allowedGroupReason = evaluateAllowedDoctorGroupRule(
      doctor,
      input.shift,
      input.allowedDoctorGroupIdByDate
    );
    if (allowedGroupReason) {
      reasons.push(allowedGroupReason);
    }

    const oneShiftPerDayReason = evaluateOneShiftPerDayRule(
      doctor,
      input.shift,
      input.currentAssignments,
      input.shiftsById
    );
    if (oneShiftPerDayReason) {
      reasons.push(oneShiftPerDayReason);
    }

    const restAfterNightShiftReason = evaluateRestAfterNightShiftRule(
      doctor,
      input.shift,
      input.currentAssignments,
      input.shiftsById
    );
    if (restAfterNightShiftReason) {
      reasons.push(restAfterNightShiftReason);
    }

    // TODO: Add operational override rules.
    return {
      doctorId: doctor.id,
      isEligible: reasons.length === 0,
      reasons
    };
  });
}
