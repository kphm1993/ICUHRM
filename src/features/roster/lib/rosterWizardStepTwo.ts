import type {
  AllowedDoctorGroupIdByDate,
  AssignedGroupConstraint,
  Doctor,
  DoctorExclusionPeriod,
  EntityId,
  GroupConstraintTemplate,
  ISODateString,
  RosterPeriod
} from "@/domain/models";
import { enumerateDates } from "@/domain/scheduling/dateUtils";

export type ExcludedDoctorsByDate = ReadonlyMap<
  ISODateString,
  ReadonlySet<EntityId>
>;

export interface RosterWizardStepTwoState {
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
}

export interface RosterWizardValidatedStepTwoDraft
  extends RosterWizardStepTwoState {
  readonly groupConstraintTemplateIds: ReadonlyArray<EntityId>;
  readonly allowedDoctorGroupIdByDate: AllowedDoctorGroupIdByDate;
  readonly excludedDoctorsByDate: ExcludedDoctorsByDate;
}

function sortGroupConstraints(
  groupConstraints: ReadonlyArray<AssignedGroupConstraint>
): ReadonlyArray<AssignedGroupConstraint> {
  return [...groupConstraints]
    .map((constraint) => ({ ...constraint }))
    .sort((left, right) => {
      const dateComparison = left.date.localeCompare(right.date);
      return dateComparison !== 0
        ? dateComparison
        : left.templateId.localeCompare(right.templateId);
    });
}

function sortDoctorExclusionPeriods(
  excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>
): ReadonlyArray<DoctorExclusionPeriod> {
  return [...excludedDoctorPeriods]
    .map((period) => ({
      ...period,
      reason: period.reason?.trim() || undefined
    }))
    .sort((left, right) => {
      const startComparison = left.startDate.localeCompare(right.startDate);
      if (startComparison !== 0) {
        return startComparison;
      }

      const endComparison = left.endDate.localeCompare(right.endDate);
      if (endComparison !== 0) {
        return endComparison;
      }

      const doctorComparison = left.doctorId.localeCompare(right.doctorId);
      return doctorComparison !== 0 ? doctorComparison : left.id.localeCompare(right.id);
    });
}

export function buildRosterWizardStepTwoState(input: {
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
}): RosterWizardStepTwoState {
  return {
    groupConstraints: sortGroupConstraints(input.groupConstraints),
    excludedDoctorPeriods: sortDoctorExclusionPeriods(input.excludedDoctorPeriods)
  };
}

export function pruneRosterWizardStepTwoStateToRange(input: {
  readonly effectiveRange: RosterPeriod;
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
}): RosterWizardStepTwoState {
  return buildRosterWizardStepTwoState({
    groupConstraints: input.groupConstraints.filter(
      (constraint) =>
        constraint.date >= input.effectiveRange.startDate &&
        constraint.date <= input.effectiveRange.endDate
    ),
    excludedDoctorPeriods: input.excludedDoctorPeriods
      .map((period) => {
        const startDate =
          period.startDate < input.effectiveRange.startDate
            ? input.effectiveRange.startDate
            : period.startDate;
        const endDate =
          period.endDate > input.effectiveRange.endDate
            ? input.effectiveRange.endDate
            : period.endDate;

        if (startDate > endDate) {
          return null;
        }

        return {
          ...period,
          startDate,
          endDate
        };
      })
      .filter((period): period is DoctorExclusionPeriod => period !== null)
  });
}

export function buildExcludedDoctorsByDateLookup(
  excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>
): ExcludedDoctorsByDate {
  const lookup = new Map<ISODateString, Set<EntityId>>();

  excludedDoctorPeriods.forEach((period) => {
    enumerateDates(period.startDate, period.endDate).forEach((date) => {
      const excludedDoctorIds = lookup.get(date) ?? new Set<EntityId>();
      excludedDoctorIds.add(period.doctorId);
      lookup.set(date as ISODateString, excludedDoctorIds);
    });
  });

  return new Map(
    Array.from(lookup.entries()).map(([date, excludedDoctorIds]) => [
      date,
      new Set(excludedDoctorIds)
    ])
  );
}

export function countExcludedDoctorImpactDates(
  excludedDoctorsByDate: ExcludedDoctorsByDate
): number {
  return excludedDoctorsByDate.size;
}

export function validateRosterWizardStepTwoDraft(input: {
  readonly effectiveRange: RosterPeriod;
  readonly groupConstraints: ReadonlyArray<AssignedGroupConstraint>;
  readonly excludedDoctorPeriods: ReadonlyArray<DoctorExclusionPeriod>;
  readonly templates: ReadonlyArray<GroupConstraintTemplate>;
  readonly doctors: ReadonlyArray<Doctor>;
}): RosterWizardValidatedStepTwoDraft {
  const templateIds = new Set(input.templates.map((template) => template.id));
  const templatesById = new Map(
    input.templates.map((template) => [template.id, template] as const)
  );
  const doctorIds = new Set(input.doctors.map((doctor) => doctor.id));
  const normalizedGroupConstraints = sortGroupConstraints(
    input.groupConstraints.filter(
      (constraint) =>
        constraint.date >= input.effectiveRange.startDate &&
        constraint.date <= input.effectiveRange.endDate
    )
  );
  const seenConstraintDates = new Set<ISODateString>();

  normalizedGroupConstraints.forEach((constraint) => {
    if (!templateIds.has(constraint.templateId)) {
      throw new Error(
        `Group constraint template '${constraint.templateId}' was not found.`
      );
    }

    if (seenConstraintDates.has(constraint.date)) {
      throw new Error(
        `Only one group constraint template can be assigned to ${constraint.date}.`
      );
    }

    seenConstraintDates.add(constraint.date);
  });

  const normalizedExcludedDoctorPeriods = sortDoctorExclusionPeriods(
    input.excludedDoctorPeriods
      .map((period) => {
        if (!doctorIds.has(period.doctorId)) {
          throw new Error(`Doctor '${period.doctorId}' was not found.`);
        }

        if (period.startDate > period.endDate) {
          throw new Error(
            `Doctor exclusion '${period.id}' must end on or after ${period.startDate}.`
          );
        }

        const clippedStartDate =
          period.startDate < input.effectiveRange.startDate
            ? input.effectiveRange.startDate
            : period.startDate;
        const clippedEndDate =
          period.endDate > input.effectiveRange.endDate
            ? input.effectiveRange.endDate
            : period.endDate;

        if (clippedStartDate > clippedEndDate) {
          return null;
        }

        return {
          ...period,
          startDate: clippedStartDate,
          endDate: clippedEndDate
        };
      })
      .filter((period): period is DoctorExclusionPeriod => period !== null)
  );

  const allowedDoctorGroupIdByDate = Object.fromEntries(
    normalizedGroupConstraints.map((constraint) => {
      const template = templatesById.get(constraint.templateId);

      if (!template) {
        throw new Error(
          `Group constraint template '${constraint.templateId}' was not found.`
        );
      }

      return [constraint.date, template.rules.allowedDoctorGroupId];
    })
  ) as AllowedDoctorGroupIdByDate;
  const groupConstraintTemplateIds = Array.from(
    new Set(normalizedGroupConstraints.map((constraint) => constraint.templateId))
  ).sort();
  const excludedDoctorsByDate =
    buildExcludedDoctorsByDateLookup(normalizedExcludedDoctorPeriods);

  return {
    groupConstraintTemplateIds,
    groupConstraints: normalizedGroupConstraints,
    excludedDoctorPeriods: normalizedExcludedDoctorPeriods,
    allowedDoctorGroupIdByDate,
    excludedDoctorsByDate
  };
}
