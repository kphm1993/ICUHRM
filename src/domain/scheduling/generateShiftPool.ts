import type {
  EntityId,
  Shift,
  ShiftType
} from "@/domain/models";
import type {
  GenerateShiftPoolInput,
  GenerateShiftPoolOutput,
  GeneratedShiftMetadata,
  ShiftPoolSource
} from "@/domain/scheduling/contracts";
import { planDutyDesignDates } from "@/domain/scheduling/dutyDesignPlanning";
import {
  resolveGroupEligibility,
  resolveShiftCategory,
  resolveShiftSpecialFlag
} from "@/domain/scheduling/shiftClassification";

function createShift(input: {
  readonly rosterId: EntityId;
  readonly date: Shift["date"];
  readonly shiftType: ShiftType;
  readonly locationId: EntityId;
  readonly generatedAt: string;
  readonly shiftKey: string;
}): Shift {
  const special = resolveShiftSpecialFlag(input.date, input.shiftType);
  const category = resolveShiftCategory(input.date);

  return {
    id: `${input.rosterId}:${input.shiftKey}`,
    rosterId: input.rosterId,
    date: input.date,
    shiftTypeId: input.shiftType.id,
    locationId: input.locationId,
    startTime: input.shiftType.startTime,
    endTime: input.shiftType.endTime,
    type: input.shiftType.category,
    category,
    special,
    groupEligibility: resolveGroupEligibility(category, special),
    definitionSnapshot: {
      shiftTypeId: input.shiftType.id,
      locationId: input.locationId,
      code: input.shiftType.code,
      label: input.shiftType.label,
      startTime: input.shiftType.startTime,
      endTime: input.shiftType.endTime
    },
    createdAt: input.generatedAt
  } satisfies Shift;
}

function createShiftMetadata(
  input: Omit<GeneratedShiftMetadata, "sourceDate" | "source"> & {
    readonly sourceDate: Shift["date"];
    readonly source: ShiftPoolSource;
  }
): GeneratedShiftMetadata {
  return {
    source: input.source,
    sourceDate: input.sourceDate,
    dutyDesignId: input.dutyDesignId,
    dutyDesignBlockIndex: input.dutyDesignBlockIndex,
    slotIndex: input.slotIndex,
    offOffsetDays: input.offOffsetDays,
    followUpDutyDesignId: input.followUpDutyDesignId
  };
}

export function generateShiftPool(
  input: GenerateShiftPoolInput
): GenerateShiftPoolOutput {
  const generatedAt = new Date().toISOString();
  const activeShiftTypes = input.shiftTypes.filter((shiftType) => shiftType.isActive);
  const shiftTypesById = new Map(
    activeShiftTypes.map((shiftType) => [shiftType.id, shiftType] as const)
  );
  const { datePlans, warnings } = planDutyDesignDates({
    range: input.range,
    dutyDesigns: input.dutyDesigns,
    dutyDesignAssignments: input.dutyDesignAssignments,
    shiftTypes: input.shiftTypes,
    activeDutyLocations: input.activeDutyLocations,
    publicHolidayDates: input.publicHolidayDates
  });
  const shifts: Shift[] = [];
  const shiftMetadataById = new Map<EntityId, GeneratedShiftMetadata>();

  datePlans.forEach((datePlan) => {
    if (!datePlan.effectiveDutyDesign) {
      activeShiftTypes.forEach((shiftType) => {
        const shift = createShift({
          rosterId: input.rosterId,
          date: datePlan.date,
          shiftType,
          locationId: input.fallbackLocationId,
          generatedAt,
          shiftKey: `${datePlan.date}:${shiftType.code.toLowerCase()}`
        });

        shifts.push(shift);
        shiftMetadataById.set(
          shift.id,
          createShiftMetadata({
            source: "LEGACY_FALLBACK",
            sourceDate: datePlan.date
          })
        );
      });

      return;
    }

    const effectiveDutyDesign = datePlan.effectiveDutyDesign;

    effectiveDutyDesign.dutyBlocks.forEach((block, blockIndex) => {
      const shiftType = shiftTypesById.get(block.shiftTypeId);

      if (!shiftType) {
        throw new Error(
          `Duty design '${effectiveDutyDesign.code}' block ${blockIndex + 1} references shift type '${block.shiftTypeId}', which is missing from generation input.`
        );
      }

      const locationId = block.locationId ?? input.fallbackLocationId;

      for (let slotIndex = 0; slotIndex < block.doctorCount; slotIndex += 1) {
        const shift = createShift({
          rosterId: input.rosterId,
          date: datePlan.date,
          shiftType,
          locationId,
          generatedAt,
          shiftKey: [
            datePlan.date,
            shiftType.code.toLowerCase(),
            `design-${effectiveDutyDesign.code.toLowerCase()}`,
            `block-${blockIndex + 1}`,
            `slot-${slotIndex + 1}`
          ].join(":")
        });

        shifts.push(shift);
        shiftMetadataById.set(
          shift.id,
          createShiftMetadata({
            source: datePlan.source,
            sourceDate: datePlan.date,
            dutyDesignId: effectiveDutyDesign.id,
            dutyDesignBlockIndex: blockIndex,
            slotIndex,
            offOffsetDays: block.offOffsetDays,
            followUpDutyDesignId: block.followUpDutyDesignId
          })
        );
      }
    });
  });

  return {
    shifts,
    shiftMetadataById,
    warnings
  };
}
