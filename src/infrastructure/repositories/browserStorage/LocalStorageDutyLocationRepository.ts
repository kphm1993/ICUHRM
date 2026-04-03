import type { DutyLocation } from "@/domain/models";
import type { DutyLocationRepository } from "@/domain/repositories";
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

function cloneDutyLocation(location: DutyLocation): DutyLocation {
  return { ...location };
}

function sortDutyLocations(
  locations: ReadonlyArray<DutyLocation>
): ReadonlyArray<DutyLocation> {
  return [...locations].sort((left, right) => {
    const labelComparison = left.label.localeCompare(right.label);
    return labelComparison !== 0
      ? labelComparison
      : left.code.localeCompare(right.code);
  });
}

export class LocalStorageDutyLocationRepository
  implements DutyLocationRepository
{
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<DutyLocation>;

  constructor(options: BrowserStorageRepositoryOptions<DutyLocation> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.dutyLocations;
    this.seedData = options.seedData ?? [];
  }

  async create(location: DutyLocation): Promise<DutyLocation> {
    const entries = this.readEntries();
    this.assertUniqueConstraints(location, entries);
    entries.push(cloneDutyLocation(location));
    this.writeEntries(entries);
    return cloneDutyLocation(location);
  }

  async update(
    id: string,
    changes: Partial<DutyLocation>
  ): Promise<DutyLocation> {
    const entries = this.readEntries();
    const existingLocation = entries.find((entry) => entry.id === id);

    if (!existingLocation) {
      throw new RepositoryNotFoundError(`Duty location '${id}' was not found.`);
    }

    const nextLocation: DutyLocation = {
      ...existingLocation,
      ...changes,
      id: existingLocation.id,
      createdAt: existingLocation.createdAt
    };

    this.assertUniqueConstraints(nextLocation, entries);
    const nextEntries = entries.filter((entry) => entry.id !== id);
    nextEntries.push(cloneDutyLocation(nextLocation));
    this.writeEntries(nextEntries);
    return cloneDutyLocation(nextLocation);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(`Duty location '${id}' was not found.`);
    }

    this.writeEntries(nextEntries);
  }

  async getById(id: string): Promise<DutyLocation | null> {
    const location = this.readEntries().find((entry) => entry.id === id);
    return location ? cloneDutyLocation(location) : null;
  }

  async listActive(): Promise<ReadonlyArray<DutyLocation>> {
    return sortDutyLocations(
      this.readEntries().filter((location) => location.isActive)
    ).map(cloneDutyLocation);
  }

  async listAll(): Promise<ReadonlyArray<DutyLocation>> {
    return sortDutyLocations(this.readEntries()).map(cloneDutyLocation);
  }

  private readEntries(): DutyLocation[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneDutyLocation
    );
  }

  private writeEntries(entries: ReadonlyArray<DutyLocation>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortDutyLocations(entries).map(cloneDutyLocation)
    );
  }

  private assertUniqueConstraints(
    candidate: DutyLocation,
    entries: ReadonlyArray<DutyLocation>
  ): void {
    for (const existingLocation of entries) {
      if (existingLocation.id === candidate.id) {
        continue;
      }

      if (existingLocation.code === candidate.code) {
        throw new RepositoryConflictError(
          `Duty location code '${candidate.code}' is already in use.`
        );
      }
    }
  }
}
