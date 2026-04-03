import type { Shift } from "@/domain/models";
import { enumerateDates } from "@/domain/scheduling/dateUtils";
import type { GenerateShiftPoolInput } from "@/domain/scheduling/contracts";
import {
  resolveGroupEligibility,
  resolveShiftCategory,
  resolveShiftSpecialFlag
} from "@/domain/scheduling/shiftClassification";

export function generateShiftPool(input: GenerateShiftPoolInput): ReadonlyArray<Shift> {
  const generatedAt = new Date().toISOString();
  const activeShiftTypes = input.shiftTypes.filter((shiftType) => shiftType.isActive);

  return enumerateDates(input.range.startDate, input.range.endDate).flatMap((date) =>
    activeShiftTypes.map((shiftType) => {
      const special = resolveShiftSpecialFlag(date, shiftType);
      const category = resolveShiftCategory(date);

      return {
        id: `${input.rosterId}:${date}:${shiftType.code.toLowerCase()}`,
        rosterId: input.rosterId,
        date,
        shiftTypeId: shiftType.id,
        locationId: input.generationLocationId,
        startTime: shiftType.startTime,
        endTime: shiftType.endTime,
        type: shiftType.defaultKind,
        category,
        special,
        groupEligibility: resolveGroupEligibility(category, special),
        definitionSnapshot: {
          shiftTypeId: shiftType.id,
          locationId: input.generationLocationId,
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
