import type { DutyLocation } from "@/domain/models";
import type { DutyLocationRepository } from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";

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

export class InMemoryDutyLocationRepository implements DutyLocationRepository {
  private readonly locationsById = new Map<string, DutyLocation>();

  constructor(seedData: ReadonlyArray<DutyLocation> = []) {
    for (const location of seedData) {
      this.assertUniqueConstraints(location);
      this.locationsById.set(location.id, cloneDutyLocation(location));
    }
  }

  async create(location: DutyLocation): Promise<DutyLocation> {
    const timestamp = new Date().toISOString();
    const nextLocation: DutyLocation = {
      ...location,
      id: location.id || crypto.randomUUID(),
      createdAt: location.createdAt || timestamp,
      updatedAt: timestamp
    };

    this.assertUniqueConstraints(nextLocation);
    this.locationsById.set(nextLocation.id, cloneDutyLocation(nextLocation));
    return cloneDutyLocation(nextLocation);
  }

  async update(
    id: string,
    changes: Partial<DutyLocation>
  ): Promise<DutyLocation> {
    const existingLocation = this.locationsById.get(id);

    if (!existingLocation) {
      throw new RepositoryNotFoundError(`Duty location '${id}' was not found.`);
    }

    const nextLocation: DutyLocation = {
      ...existingLocation,
      ...changes,
      id: existingLocation.id,
      createdAt: existingLocation.createdAt,
      updatedAt: changes.updatedAt ?? new Date().toISOString()
    };

    this.assertUniqueConstraints(nextLocation);
    this.locationsById.set(id, cloneDutyLocation(nextLocation));
    return cloneDutyLocation(nextLocation);
  }

  async delete(id: string): Promise<void> {
    const wasDeleted = this.locationsById.delete(id);

    if (!wasDeleted) {
      throw new RepositoryNotFoundError(`Duty location '${id}' was not found.`);
    }
  }

  async getById(id: string): Promise<DutyLocation | null> {
    const location = this.locationsById.get(id);
    return location ? cloneDutyLocation(location) : null;
  }

  async listActive(): Promise<ReadonlyArray<DutyLocation>> {
    return sortDutyLocations(
      Array.from(this.locationsById.values()).filter((location) => location.isActive)
    ).map(cloneDutyLocation);
  }

  async listAll(): Promise<ReadonlyArray<DutyLocation>> {
    return sortDutyLocations(Array.from(this.locationsById.values())).map(
      cloneDutyLocation
    );
  }

  private assertUniqueConstraints(candidate: DutyLocation): void {
    for (const existingLocation of this.locationsById.values()) {
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
