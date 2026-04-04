import type {
  DutyDesign,
  DutyDesignAssignment,
  DutyLocation,
  EntityId,
  ISODateString,
  RosterPeriod,
  ShiftType
} from "@/domain/models";
import type { ShiftPoolSource } from "@/domain/scheduling/contracts";
import { enumerateDates } from "@/domain/scheduling/dateUtils";

export interface DutyDesignDatePlan {
  readonly date: ISODateString;
  readonly isHolidayDate: boolean;
  readonly standardAssignment?: DutyDesignAssignment;
  readonly holidayAssignment?: DutyDesignAssignment;
  readonly effectiveAssignment?: DutyDesignAssignment;
  readonly effectiveDutyDesign?: DutyDesign;
  readonly source: ShiftPoolSource;
}

export interface PlanDutyDesignDatesInput {
  readonly range: RosterPeriod;
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly shiftTypes: ReadonlyArray<ShiftType>;
  readonly activeDutyLocations: ReadonlyArray<DutyLocation>;
  readonly publicHolidayDates?: ReadonlyArray<ISODateString>;
}

export interface PlanDutyDesignDatesOutput {
  readonly datePlans: ReadonlyArray<DutyDesignDatePlan>;
  readonly warnings: ReadonlyArray<string>;
}

function buildAssignmentKey(
  date: ISODateString,
  isHolidayOverride: boolean
): string {
  return `${date}:${isHolidayOverride ? "holiday" : "standard"}`;
}

function validateDutyDesignForGeneration(input: {
  readonly dutyDesign: DutyDesign;
  readonly dutyDesignsById: ReadonlyMap<EntityId, DutyDesign>;
  readonly activeShiftTypeIds: ReadonlySet<EntityId>;
  readonly activeLocationIds: ReadonlySet<EntityId>;
}): void {
  if (!input.dutyDesign.isActive) {
    throw new Error(
      `Duty design '${input.dutyDesign.label}' must be active before it can be used in roster generation.`
    );
  }

  if (input.dutyDesign.dutyBlocks.length === 0) {
    throw new Error(
      `Duty design '${input.dutyDesign.label}' does not contain any duty blocks.`
    );
  }

  input.dutyDesign.dutyBlocks.forEach((block, blockIndex) => {
    if (!input.activeShiftTypeIds.has(block.shiftTypeId)) {
      throw new Error(
        `Duty design '${input.dutyDesign.code}' block ${blockIndex + 1} references shift type '${block.shiftTypeId}', which is missing or inactive for roster generation.`
      );
    }

    if (
      block.locationId !== undefined &&
      !input.activeLocationIds.has(block.locationId)
    ) {
      throw new Error(
        `Duty design '${input.dutyDesign.code}' block ${blockIndex + 1} references location '${block.locationId}', which is missing or inactive for roster generation.`
      );
    }

    if (
      block.followUpDutyDesignId !== undefined &&
      !input.dutyDesignsById.has(block.followUpDutyDesignId)
    ) {
      throw new Error(
        `Duty design '${input.dutyDesign.code}' block ${blockIndex + 1} references unknown follow-up duty design '${block.followUpDutyDesignId}'.`
      );
    }
  });
}

function describeDesignIds(
  dutyDesignsById: ReadonlyMap<EntityId, DutyDesign>,
  designIds: ReadonlyArray<EntityId>
): string {
  return designIds
    .map((designId) => dutyDesignsById.get(designId)?.code ?? designId)
    .join(", ");
}

export function planDutyDesignDates(
  input: PlanDutyDesignDatesInput
): PlanDutyDesignDatesOutput {
  const dutyDesignsById = new Map(
    input.dutyDesigns.map((dutyDesign) => [dutyDesign.id, dutyDesign] as const)
  );
  const assignmentByKey = new Map<string, DutyDesignAssignment>();
  const warnings = new Set<string>();
  const activeShiftTypeIds = new Set(
    input.shiftTypes
      .filter((shiftType) => shiftType.isActive)
      .map((shiftType) => shiftType.id)
  );
  const activeLocationIds = new Set(
    input.activeDutyLocations
      .filter((location) => location.isActive)
      .map((location) => location.id)
  );
  const holidayDateSet = new Set(input.publicHolidayDates ?? []);
  const datesInRange = new Set(
    enumerateDates(input.range.startDate, input.range.endDate)
  );
  const referencedDesignIds = new Set<EntityId>();

  for (const assignment of input.dutyDesignAssignments) {
    if (!datesInRange.has(assignment.date)) {
      continue;
    }

    const key = buildAssignmentKey(
      assignment.date,
      assignment.isHolidayOverride
    );

    if (assignmentByKey.has(key)) {
      throw new Error(
        `Duty design assignments contain multiple ${assignment.isHolidayOverride ? "holiday override" : "standard"} mappings for ${assignment.date}.`
      );
    }

    const dutyDesign = dutyDesignsById.get(assignment.dutyDesignId);

    if (!dutyDesign) {
      throw new Error(
        `Duty design assignment on ${assignment.date} references unknown duty design '${assignment.dutyDesignId}'.`
      );
    }

    referencedDesignIds.add(dutyDesign.id);
    assignmentByKey.set(key, assignment);
  }

  for (const dutyDesignId of referencedDesignIds) {
    const dutyDesign = dutyDesignsById.get(dutyDesignId);

    if (!dutyDesign) {
      continue;
    }

    validateDutyDesignForGeneration({
      dutyDesign,
      dutyDesignsById,
      activeShiftTypeIds,
      activeLocationIds
    });
  }

  const datePlans = enumerateDates(
    input.range.startDate,
    input.range.endDate
  ).map<DutyDesignDatePlan>((date) => {
    const standardAssignment = assignmentByKey.get(buildAssignmentKey(date, false));
    const holidayAssignment = assignmentByKey.get(buildAssignmentKey(date, true));
    const isHolidayDate = holidayDateSet.has(date);

    if (isHolidayDate && holidayAssignment) {
      return {
        date,
        isHolidayDate,
        standardAssignment,
        holidayAssignment,
        effectiveAssignment: holidayAssignment,
        effectiveDutyDesign: dutyDesignsById.get(holidayAssignment.dutyDesignId),
        source: "DUTY_DESIGN_HOLIDAY_OVERRIDE"
      };
    }

    if (standardAssignment) {
      if (isHolidayDate && !holidayAssignment) {
        warnings.add(
          `Holiday date ${date} has no holiday-override duty design assignment; standard duty design mapping will be used.`
        );
      }

      if (!isHolidayDate && holidayAssignment) {
        warnings.add(
          `Holiday-override duty design assignment on ${date} was ignored because the date is not marked as a public holiday.`
        );
      }

      return {
        date,
        isHolidayDate,
        standardAssignment,
        holidayAssignment,
        effectiveAssignment: standardAssignment,
        effectiveDutyDesign: dutyDesignsById.get(standardAssignment.dutyDesignId),
        source: "DUTY_DESIGN_STANDARD"
      };
    }

    if (isHolidayDate) {
      if (holidayAssignment) {
        return {
          date,
          isHolidayDate,
          standardAssignment,
          holidayAssignment,
          effectiveAssignment: holidayAssignment,
          effectiveDutyDesign: dutyDesignsById.get(holidayAssignment.dutyDesignId),
          source: "DUTY_DESIGN_HOLIDAY_OVERRIDE"
        };
      }

      warnings.add(
        `Holiday date ${date} has no holiday-override duty design assignment; legacy shift generation will be used.`
      );
    } else if (holidayAssignment) {
      warnings.add(
        `Holiday-override duty design assignment on ${date} was ignored because the date is not marked as a public holiday.`
      );
    }

    return {
      date,
      isHolidayDate,
      standardAssignment,
      holidayAssignment,
      source: "LEGACY_FALLBACK"
    };
  });

  datePlans.forEach((datePlan, index) => {
    if (!datePlan.effectiveDutyDesign) {
      return;
    }

    const followUpDesignIds = [
      ...new Set(
        datePlan.effectiveDutyDesign.dutyBlocks
          .map((block) => block.followUpDutyDesignId)
          .filter((entry): entry is EntityId => entry !== undefined)
      )
    ];

    if (followUpDesignIds.length === 0) {
      return;
    }

    const nextDatePlan = datePlans[index + 1];

    if (!nextDatePlan) {
      return;
    }

    const nextDutyDesignId = nextDatePlan.effectiveDutyDesign?.id;

    if (nextDutyDesignId && followUpDesignIds.includes(nextDutyDesignId)) {
      return;
    }

    warnings.add(
      `Duty design '${datePlan.effectiveDutyDesign.code}' on ${datePlan.date} expects follow-up design ${describeDesignIds(dutyDesignsById, followUpDesignIds)} on ${nextDatePlan.date}, but resolved ${nextDatePlan.effectiveDutyDesign?.code ?? "legacy fallback"}.`
    );
  });

  return {
    datePlans,
    warnings: Array.from(warnings)
  };
}
