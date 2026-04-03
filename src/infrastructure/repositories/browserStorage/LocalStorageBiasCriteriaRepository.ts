import type { BiasCriteria } from "@/domain/models";
import type { BiasCriteriaRepository } from "@/domain/repositories";
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

function cloneBiasCriteria(criteria: BiasCriteria): BiasCriteria {
  return {
    ...criteria,
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

export class LocalStorageBiasCriteriaRepository
  implements BiasCriteriaRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<BiasCriteria>;

  constructor(options: BrowserStorageRepositoryOptions<BiasCriteria> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.biasCriteria;
    this.seedData = options.seedData ?? [];
  }

  async create(criteria: BiasCriteria): Promise<BiasCriteria> {
    const entries = this.readEntries();
    this.assertUniqueConstraints(criteria, entries);
    entries.push(cloneBiasCriteria(criteria));
    this.writeEntries(entries);
    return cloneBiasCriteria(criteria);
  }

  async update(
    id: string,
    changes: Partial<BiasCriteria>
  ): Promise<BiasCriteria> {
    const entries = this.readEntries();
    const existingCriteria = entries.find((entry) => entry.id === id);

    if (!existingCriteria) {
      throw new RepositoryNotFoundError(`Bias criteria '${id}' was not found.`);
    }

    const nextCriteria: BiasCriteria = {
      ...existingCriteria,
      ...changes,
      id: existingCriteria.id,
      createdAt: existingCriteria.createdAt,
      createdByActorId: existingCriteria.createdByActorId
    };

    this.assertUniqueConstraints(nextCriteria, entries);
    const nextEntries = entries.filter((entry) => entry.id !== id);
    nextEntries.push(cloneBiasCriteria(nextCriteria));
    this.writeEntries(nextEntries);
    return cloneBiasCriteria(nextCriteria);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(`Bias criteria '${id}' was not found.`);
    }

    this.writeEntries(nextEntries);
  }

  async getById(id: string): Promise<BiasCriteria | null> {
    const criteria = this.readEntries().find((entry) => entry.id === id);
    return criteria ? cloneBiasCriteria(criteria) : null;
  }

  async listActive(): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(
      this.readEntries().filter((criteria) => criteria.isActive)
    ).map(cloneBiasCriteria);
  }

  async listAll(): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(this.readEntries()).map(cloneBiasCriteria);
  }

  async listByLocationId(
    locationId: string
  ): Promise<ReadonlyArray<BiasCriteria>> {
    return sortBiasCriteria(
      this.readEntries().filter(
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
      this.readEntries().filter(
        (criteria) =>
          criteria.shiftTypeIds.length === 0 ||
          criteria.shiftTypeIds.includes(shiftTypeId)
      )
    ).map(cloneBiasCriteria);
  }

  private readEntries(): BiasCriteria[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneBiasCriteria
    );
  }

  private writeEntries(entries: ReadonlyArray<BiasCriteria>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortBiasCriteria(entries).map(cloneBiasCriteria)
    );
  }

  private assertUniqueConstraints(
    candidate: BiasCriteria,
    entries: ReadonlyArray<BiasCriteria>
  ): void {
    for (const existingCriteria of entries) {
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
