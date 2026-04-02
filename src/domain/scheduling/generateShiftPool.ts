import type {
  GroupEligibility,
  Shift,
  ShiftSpecialFlag,
  ShiftType
} from "@/domain/models";
import { enumerateDates } from "@/domain/scheduling/dateUtils";
import type { GenerateShiftPoolInput } from "@/domain/scheduling/contracts";

function resolveSpecialFlag(
  date: string,
  shiftType: ShiftType
): ShiftSpecialFlag {
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return dayOfWeek === 5 && shiftType.defaultKind === "NIGHT"
    ? "FRIDAY_NIGHT"
    : "NONE";
}

function resolveCategory(date: string): "WEEKDAY" | "WEEKEND" {
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return dayOfWeek === 6 || dayOfWeek === 0 ? "WEEKEND" : "WEEKDAY";
}

function resolveGroupEligibility(
  category: Shift["category"],
  special: ShiftSpecialFlag,
  weekendGroupSchedule: GenerateShiftPoolInput["weekendGroupSchedule"],
  date: string
): GroupEligibility {
  if (category === "WEEKDAY" && special !== "FRIDAY_NIGHT") {
    return "ALL";
  }

  const weekendStartDate =
    special === "FRIDAY_NIGHT"
      ? new Date(`${date}T00:00:00.000Z`)
      : new Date(`${date}T00:00:00.000Z`);

  if (special === "FRIDAY_NIGHT") {
    weekendStartDate.setUTCDate(weekendStartDate.getUTCDate() + 1);
  } else if (weekendStartDate.getUTCDay() === 0) {
    weekendStartDate.setUTCDate(weekendStartDate.getUTCDate() - 1);
  }

  const weekendDateKey = weekendStartDate.toISOString().slice(0, 10);
  const weekendRule = weekendGroupSchedule.find(
    (entry) => entry.weekendStartDate === weekendDateKey
  );

  if (!weekendRule) {
    return "NOT_WEEKEND_OFF_GROUP";
  }

  return weekendRule.offGroup === "A" ? "WEEKEND_GROUP_B" : "WEEKEND_GROUP_A";
}

export function generateShiftPool(input: GenerateShiftPoolInput): ReadonlyArray<Shift> {
  const generatedAt = new Date().toISOString();
  const activeShiftTypes = input.shiftTypes.filter((shiftType) => shiftType.isActive);

  return enumerateDates(input.range.startDate, input.range.endDate).flatMap((date) =>
    activeShiftTypes.map((shiftType) => {
      const special = resolveSpecialFlag(date, shiftType);
      const category = resolveCategory(date);

      return {
        id: `${input.rosterId}:${date}:${shiftType.code.toLowerCase()}`,
        rosterId: input.rosterId,
        date,
        shiftTypeId: shiftType.id,
        type: shiftType.defaultKind,
        category,
        special,
        groupEligibility: resolveGroupEligibility(
          category,
          special,
          input.weekendGroupSchedule,
          date
        ),
        definitionSnapshot: {
          shiftTypeId: shiftType.id,
          code: shiftType.code,
          label: shiftType.label,
          startTime: shiftType.startTime,
          endTime: shiftType.endTime
        },
        createdAt: generatedAt
      } satisfies Shift;
    })
  );
}

