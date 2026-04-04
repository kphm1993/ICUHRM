import type {
  DutyDesign,
  DutyDesignAssignment,
  ISODateString,
  RosterPeriod
} from "@/domain/models";
import { isDateWithinRosterWizardRange } from "@/features/roster/lib/rosterWizardStepOne";

export interface RosterWizardStepThreeState {
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
}

export interface RosterWizardDutyDesignAssignmentsByDateEntry {
  readonly standardAssignment?: DutyDesignAssignment;
  readonly holidayOverrideAssignment?: DutyDesignAssignment;
}

export type RosterWizardDutyDesignAssignmentsByDate = Readonly<
  Record<ISODateString, RosterWizardDutyDesignAssignmentsByDateEntry>
>;

export interface RosterWizardValidatedStepThreeDraft
  extends RosterWizardStepThreeState {
  readonly assignmentsByDate: RosterWizardDutyDesignAssignmentsByDate;
}

function cloneDutyDesignAssignment(
  assignment: DutyDesignAssignment
): DutyDesignAssignment {
  return { ...assignment };
}

function compareDutyDesignAssignments(
  left: DutyDesignAssignment,
  right: DutyDesignAssignment
): number {
  const dateComparison = left.date.localeCompare(right.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  if (left.isHolidayOverride !== right.isHolidayOverride) {
    return left.isHolidayOverride ? 1 : -1;
  }

  const designComparison = left.dutyDesignId.localeCompare(right.dutyDesignId);

  if (designComparison !== 0) {
    return designComparison;
  }

  return left.id.localeCompare(right.id);
}

function sortDutyDesignAssignments(
  dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>
): ReadonlyArray<DutyDesignAssignment> {
  return [...dutyDesignAssignments]
    .map(cloneDutyDesignAssignment)
    .sort(compareDutyDesignAssignments);
}

function buildAssignmentKey(assignment: Pick<DutyDesignAssignment, "date" | "isHolidayOverride">) {
  return `${assignment.date}:${assignment.isHolidayOverride ? "holiday" : "standard"}`;
}

export function buildRosterWizardStepThreeState(input: {
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
}): RosterWizardStepThreeState {
  return {
    dutyDesignAssignments: sortDutyDesignAssignments(input.dutyDesignAssignments)
  };
}

export function pruneRosterWizardStepThreeStateToRange(input: {
  readonly effectiveRange: RosterPeriod;
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
}): RosterWizardStepThreeState {
  const holidayDateSet = new Set(input.publicHolidayDates);

  return buildRosterWizardStepThreeState({
    dutyDesignAssignments: input.dutyDesignAssignments.filter(
      (assignment) =>
        isDateWithinRosterWizardRange(assignment.date, input.effectiveRange) &&
        (!assignment.isHolidayOverride || holidayDateSet.has(assignment.date))
    )
  });
}

export function buildRosterWizardDutyDesignAssignmentsByDate(input: {
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
}): RosterWizardDutyDesignAssignmentsByDate {
  const assignmentsByDate: Record<
    ISODateString,
    RosterWizardDutyDesignAssignmentsByDateEntry
  > = {};

  sortDutyDesignAssignments(input.dutyDesignAssignments).forEach((assignment) => {
    const currentEntry = assignmentsByDate[assignment.date] ?? {};

    assignmentsByDate[assignment.date] = assignment.isHolidayOverride
      ? {
          ...currentEntry,
          holidayOverrideAssignment: cloneDutyDesignAssignment(assignment)
        }
      : {
          ...currentEntry,
          standardAssignment: cloneDutyDesignAssignment(assignment)
        };
  });

  return assignmentsByDate;
}

export function validateRosterWizardStepThreeDraft(input: {
  readonly effectiveRange: RosterPeriod;
  readonly publicHolidayDates: ReadonlyArray<ISODateString>;
  readonly dutyDesignAssignments: ReadonlyArray<DutyDesignAssignment>;
  readonly dutyDesigns: ReadonlyArray<DutyDesign>;
  readonly rejectUnavailableDutyDesigns?: boolean;
  readonly rejectInvalidHolidayOverrideDates?: boolean;
}): RosterWizardValidatedStepThreeDraft {
  const holidayDateSet = new Set(input.publicHolidayDates);
  const dutyDesignsById = new Map(
    input.dutyDesigns.map((dutyDesign) => [dutyDesign.id, dutyDesign] as const)
  );
  const inRangeAssignments = input.dutyDesignAssignments.filter((assignment) =>
    isDateWithinRosterWizardRange(assignment.date, input.effectiveRange)
  );
  const seenAssignmentKeys = new Set<string>();

  inRangeAssignments.forEach((assignment) => {
    const key = buildAssignmentKey(assignment);

    if (seenAssignmentKeys.has(key)) {
      throw new Error(
        `Only one ${assignment.isHolidayOverride ? "holiday override" : "standard"} duty design can be assigned on ${assignment.date}.`
      );
    }

    seenAssignmentKeys.add(key);

    if (
      input.rejectInvalidHolidayOverrideDates &&
      assignment.isHolidayOverride &&
      !holidayDateSet.has(assignment.date)
    ) {
      throw new Error(
        `Holiday override duty designs can only be assigned to public holidays. ${assignment.date} is not marked as a holiday in Step 1.`
      );
    }
  });

  const normalizedState = pruneRosterWizardStepThreeStateToRange({
    effectiveRange: input.effectiveRange,
    publicHolidayDates: input.publicHolidayDates,
    dutyDesignAssignments: inRangeAssignments
  });

  if (input.rejectUnavailableDutyDesigns) {
    normalizedState.dutyDesignAssignments.forEach((assignment) => {
      const dutyDesign = dutyDesignsById.get(assignment.dutyDesignId);

      if (!dutyDesign) {
        throw new Error(
          `Duty design '${assignment.dutyDesignId}' was not found for ${assignment.date}.`
        );
      }

      if (!dutyDesign.isActive) {
        throw new Error(
          `Duty design '${dutyDesign.label}' is inactive and cannot be assigned on ${assignment.date}.`
        );
      }
    });
  }

  return {
    dutyDesignAssignments: normalizedState.dutyDesignAssignments,
    assignmentsByDate: buildRosterWizardDutyDesignAssignmentsByDate({
      dutyDesignAssignments: normalizedState.dutyDesignAssignments
    })
  };
}
