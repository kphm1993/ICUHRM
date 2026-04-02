import type {
  WeekendGroup,
  WeekendGroupScheduleEntry
} from "@/domain/models";
import { getWeekendStartDate } from "@/domain/scheduling/dateUtils";
import type {
  CheckEligibilityInput,
  EligibilityDecision
} from "@/domain/scheduling/contracts";

function isDateWithinInclusive(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  return date >= startDate && date <= endDate;
}

function resolveWeekendOffGroup(
  shiftDate: string,
  isFridayNight: boolean,
  weekendGroupSchedule: ReadonlyArray<WeekendGroupScheduleEntry>
): WeekendGroup | null {
  const weekendStartDate = getWeekendStartDate(shiftDate, isFridayNight);
  const weekendRule = weekendGroupSchedule.find(
    (entry) => entry.weekendStartDate === weekendStartDate
  );

  return weekendRule?.offGroup ?? null;
}

export function checkShiftEligibility(
  input: CheckEligibilityInput
): ReadonlyArray<EligibilityDecision> {
  return input.doctors.map((doctor) => {
    const reasons: string[] = [];

    if (!doctor.isActive) {
      reasons.push("Doctor is inactive.");
    }

    const hasOverlappingLeave = input.leaves.some(
      (leave) =>
        leave.doctorId === doctor.id &&
        isDateWithinInclusive(input.shift.date, leave.startDate, leave.endDate)
    );

    if (hasOverlappingLeave) {
      reasons.push("Doctor is on leave for this shift date.");
    }

    if (
      input.shift.groupEligibility === "WEEKEND_GROUP_A" &&
      doctor.weekendGroup !== "A"
    ) {
      reasons.push("Shift is reserved for weekend group A coverage.");
    }

    if (
      input.shift.groupEligibility === "WEEKEND_GROUP_B" &&
      doctor.weekendGroup !== "B"
    ) {
      reasons.push("Shift is reserved for weekend group B coverage.");
    }

    if (input.shift.groupEligibility === "NOT_WEEKEND_OFF_GROUP") {
      const offGroup = resolveWeekendOffGroup(
        input.shift.date,
        input.shift.special === "FRIDAY_NIGHT",
        input.weekendGroupSchedule
      );

      if (!offGroup) {
        reasons.push("Weekend group schedule is missing for a restricted shift.");
      } else if (doctor.weekendGroup === offGroup) {
        reasons.push("Doctor belongs to the weekend-off group for this shift.");
      }
    }

    // TODO: Add one-shift-per-day, consecutive-duty, and operational override rules.
    return {
      doctorId: doctor.id,
      isEligible: reasons.length === 0,
      reasons
    };
  });
}

