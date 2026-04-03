import type { BiasCriteria } from "@/domain/models";
import type { BiasCriteriaRepository } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";

function cloneBiasCriteria(criteria: BiasCriteria): BiasCriteria {
  return {
    ...criteria,
    isLocked: criteria.isLocked ?? false,
    lockedAt: criteria.lockedAt,
    lockedByActorId: criteria.lockedByActorId,
    locationIds: [...criteria.locationIds],
    shiftTypeIds: [...criteria.shiftTypeIds],
    weekdayConditions: [...criteria.weekdayConditions]
  };
}

function sortBiasCriteria(
  criteriaEntries: ReadonlyArray<BiasCriteria>
): ReadonlyArray<BiasCriteria> {
  return [...criteriaEntries].sort((left, right) => {
    const labelComparison = left.label.localeCompare(right.label);
    return labelComparison !== 0
      ? labelComparison
      : left.code.localeCompare(right.code);
  });
}

export class InMemoryBiasCriteriaRepository implements BiasCriteriaRepository {
  private readonly criteriaById = new Map<string, BiasCriteria>();

  constructor(seedData: ReadonlyArray<BiasCriteria> = []) {
    for (const criteria of seedData) {
      this.assertUniqueConstraints(criteria);
      this.criteriaById.set(criteria.id, cloneBiasCriteria(criteria));
    }
  }

  async create(criteria: BiasCriteria): Promise<BiasCriteria> {
    const timestamp = new Date().toISOString();
    const nextCriteria: BiasCriteria = {
      ...criteria,
      id: criteria.id || crypto.randomUUID(),
      isLocked: criteria.isLocked ?? false,
      lockedAt: criteria.lockedAt,
      lockedByActorId: criteria.lockedByActorId,
      createdAt: criteria.createdAt || timestamp,
      updatedAt: timestamp
    };

    this.assertUniqueConstraints(nextCriteria);
    this.criteriaById.set(nextCriteria.id, cloneBiasCriteria(nextCriteria));
    return cloneBiasCriteria(nextCriteria);
  }

  async update(
    id: string,
    changes: Partial<BiasCriteria>
  ): Promise<BiasCriteria> {
    const existingCriteria = this.criteriaById.get(id);

    if (!existingCriteria) {
      throw new RepositoryNotFoundError(`Bias criteria '${id}' was not found.`);
    }

    const nextCriteria: BiasCriteria = {
      ...existingCriteria,
      ...changes,
      id: existingCriteria.id,
      createdAt: existingCriteria.createdAt,
      createdByActorId: existingCriteria.createdByActorId,
      isLocked: changes.isLocked ?? existingCriteria.isLocked ?? false,
      lockedAt:
        changes.isLocked === false
          ? undefined
          : (changes.lockedAt ?? existingCriteria.lockedAt),
      lockedByActorId:
        changes.isLocked === false
          ? undefined
          : (changes.lockedByActorId ?? existingCriteria.lockedByActorId),
      updatedAt: changes.updatedAt ?? new Date().toISOString()
    };

    this.assertUniqueConstraints(nextCriteria);
    this.criteriaById.set(id, cloneBiasCriteria(nextCriteria));
    return cloneBiasCriteria(nextCriteria);
  }

  async delete(id: string): Promise<void> {
    const wasDeleted = this.criteriaById.delete(id);

    if (!wasDeleted) {
      throw new RepositoryNotFoundError(`Bias criteria '${id}' was not found.`);
    }
  }

  async getById(id: string): Promise<BiasCriteria | null> {
    const criteria = this.criteriaById.get(id);
    return criteria ? cloneBiasCriteria(criteria) : null;
  }

  async listActive(): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(
      Array.from(this.criteriaById.values()).filter((criteria) => criteria.isActive)
    ).map(cloneBiasCriteria);
  }

  async listAll(): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(Array.from(this.criteriaById.values())).map(
      cloneBiasCriteria
    );
  }

  async listByLocationId(
    locationId: string
  ): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(
      Array.from(this.criteriaById.values()).filter(
        (criteria) =>
          criteria.locationIds.length === 0 ||
          criteria.locationIds.includes(locationId)
      )
    ).map(cloneBiasCriteria);
  }

  async listByShiftTypeId(
    shiftTypeId: string
  ): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(
      Array.from(this.criteriaById.values()).filter(
        (criteria) =>
          criteria.shiftTypeIds.length === 0 ||
          criteria.shiftTypeIds.includes(shiftTypeId)
      )
    ).map(cloneBiasCriteria);
  }

  private assertUniqueConstraints(candidate: BiasCriteria): void {
    for (const existingCriteria of this.criteriaById.values()) {
      if (existingCriteria.id === candidate.id) {
        continue;
      }

      if (existingCriteria.code === candidate.code) {
        throw new RepositoryConflictError(
          `Bias criteria code '${candidate.code}' is already in use.`
        );
      }
    }
  }
}
