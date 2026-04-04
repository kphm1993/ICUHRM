import type { DutyDesignAssignment, RosterPeriod } from "@/domain/models";
import type { DutyDesignAssignmentRepository } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";

function cloneDutyDesignAssignment(
  assignment: DutyDesignAssignment
): DutyDesignAssignment {
  return { ...assignment };
}

function sortAssignments(
  assignments: ReadonlyArray<DutyDesignAssignment>
): ReadonlyArray<DutyDesignAssignment> {
  return [...assignments].sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);
    if (dateComparison !== 0) {
      return dateComparison;
    }

    const overrideComparison =
      Number(left.isHolidayOverride) - Number(right.isHolidayOverride);
    if (overrideComparison !== 0) {
      return overrideComparison;
    }

    const dutyDesignComparison = left.dutyDesignId.localeCompare(right.dutyDesignId);
    return dutyDesignComparison !== 0
      ? dutyDesignComparison
      : left.id.localeCompare(right.id);
  });
}

function isWithinPeriod(
  assignment: DutyDesignAssignment,
  period: RosterPeriod
): boolean {
  return (
    assignment.date >= period.startDate &&
    assignment.date <= period.endDate
  );
}

export class InMemoryDutyDesignAssignmentRepository
  implements DutyDesignAssignmentRepository
{
  private readonly assignmentsById = new Map<string, DutyDesignAssignment>();

  constructor(seedData: ReadonlyArray<DutyDesignAssignment> = []) {
    for (const assignment of seedData) {
      this.assertUniqueDateOverridePair(assignment);
      this.assignmentsById.set(assignment.id, cloneDutyDesignAssignment(assignment));
    }
  }

  async create(
    assignment: DutyDesignAssignment
  ): Promise<DutyDesignAssignment> {
    this.assertUniqueDateOverridePair(assignment);
    this.assignmentsById.set(
      assignment.id,
      cloneDutyDesignAssignment(assignment)
    );
    return cloneDutyDesignAssignment(assignment);
  }

  async update(
    id: string,
    changes: Partial<DutyDesignAssignment>
  ): Promise<DutyDesignAssignment> {
    const existingAssignment = this.assignmentsById.get(id);

    if (!existingAssignment) {
      throw new RepositoryNotFoundError(
        `Duty design assignment '${id}' was not found.`
      );
    }

    const nextAssignment: DutyDesignAssignment = {
      ...existingAssignment,
      ...changes,
      id: existingAssignment.id,
      createdAt: existingAssignment.createdAt,
      updatedAt: changes.updatedAt ?? new Date().toISOString()
    };

    this.assertUniqueDateOverridePair(nextAssignment);
    this.assignmentsById.set(id, cloneDutyDesignAssignment(nextAssignment));
    return cloneDutyDesignAssignment(nextAssignment);
  }

  async delete(id: string): Promise<void> {
    const wasDeleted = this.assignmentsById.delete(id);

    if (!wasDeleted) {
      throw new RepositoryNotFoundError(
        `Duty design assignment '${id}' was not found.`
      );
    }
  }

  async getById(id: string): Promise<DutyDesignAssignment | null> {
    const assignment = this.assignmentsById.get(id);
    return assignment ? cloneDutyDesignAssignment(assignment) : null;
  }

  async listByMonth(
    period: RosterPeriod
  ): Promise<ReadonlyArray<DutyDesignAssignment>> {
    return sortAssignments(
      Array.from(this.assignmentsById.values()).filter((assignment) =>
        isWithinPeriod(assignment, period)
      )
    ).map(cloneDutyDesignAssignment);
  }

  async listAll(): Promise<ReadonlyArray<DutyDesignAssignment>> {
    return sortAssignments(Array.from(this.assignmentsById.values())).map(
      cloneDutyDesignAssignment
    );
  }

  private assertUniqueDateOverridePair(candidate: DutyDesignAssignment): void {
    for (const existingAssignment of this.assignmentsById.values()) {
      if (existingAssignment.id === candidate.id) {
        continue;
      }

      if (
        existingAssignment.date === candidate.date &&
        existingAssignment.isHolidayOverride === candidate.isHolidayOverride
      ) {
        throw new RepositoryConflictError(
          `A ${candidate.isHolidayOverride ? "holiday override" : "standard"} duty design is already assigned on ${candidate.date}.`
        );
      }
    }
  }
}
