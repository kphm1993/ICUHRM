import type { DutyDesignAssignment, RosterPeriod } from "@/domain/models";
import type { DutyDesignAssignmentRepository } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import type { BrowserStorageRepositoryOptions } from "@/infrastructure/repositories/browserStorage/storage";
import {
  readCollectionFromStorage,
  STORAGE_KEYS,
  writeCollectionToStorage
} from "@/infrastructure/repositories/browserStorage/storage";

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

export class LocalStorageDutyDesignAssignmentRepository
  implements DutyDesignAssignmentRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<DutyDesignAssignment>;

  constructor(
    options: BrowserStorageRepositoryOptions<DutyDesignAssignment> = {}
  ) {
    this.storageKey =
      options.storageKey ?? STORAGE_KEYS.dutyDesignAssignments;
    this.seedData = options.seedData ?? [];
  }

  async create(
    assignment: DutyDesignAssignment
  ): Promise<DutyDesignAssignment> {
    const entries = this.readEntries();
    this.assertUniqueDateOverridePair(assignment, entries);
    entries.push(cloneDutyDesignAssignment(assignment));
    this.writeEntries(entries);
    return cloneDutyDesignAssignment(assignment);
  }

  async update(
    id: string,
    changes: Partial<DutyDesignAssignment>
  ): Promise<DutyDesignAssignment> {
    const entries = this.readEntries();
    const existingAssignment = entries.find((entry) => entry.id === id);

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
      updatedAt: changes.updatedAt ?? existingAssignment.updatedAt
    };

    this.assertUniqueDateOverridePair(nextAssignment, entries);
    const nextEntries = entries.filter((entry) => entry.id !== id);
    nextEntries.push(cloneDutyDesignAssignment(nextAssignment));
    this.writeEntries(nextEntries);
    return cloneDutyDesignAssignment(nextAssignment);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(
        `Duty design assignment '${id}' was not found.`
      );
    }

    this.writeEntries(nextEntries);
  }

  async getById(id: string): Promise<DutyDesignAssignment | null> {
    const assignment = this.readEntries().find((entry) => entry.id === id);
    return assignment ? cloneDutyDesignAssignment(assignment) : null;
  }

  async listByMonth(
    period: RosterPeriod
  ): Promise<ReadonlyArray<DutyDesignAssignment>> {
    return sortAssignments(
      this.readEntries().filter((assignment) => isWithinPeriod(assignment, period))
    ).map(cloneDutyDesignAssignment);
  }

  async listAll(): Promise<ReadonlyArray<DutyDesignAssignment>> {
    return sortAssignments(this.readEntries()).map(cloneDutyDesignAssignment);
  }

  private readEntries(): DutyDesignAssignment[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneDutyDesignAssignment
    );
  }

  private writeEntries(entries: ReadonlyArray<DutyDesignAssignment>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortAssignments(entries).map(cloneDutyDesignAssignment)
    );
  }

  private assertUniqueDateOverridePair(
    candidate: DutyDesignAssignment,
    entries: ReadonlyArray<DutyDesignAssignment>
  ): void {
    for (const existingAssignment of entries) {
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
