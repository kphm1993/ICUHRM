import type { ShiftType } from "@/domain/models";
import type {
  ShiftTypeRepository,
  ShiftTypeRepositoryFilter
} from "@/domain/repositories";
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

function cloneShiftType(shiftType: ShiftType): ShiftType {
  return { ...shiftType };
}

function sortShiftTypes(
  shiftTypes: ReadonlyArray<ShiftType>
): ReadonlyArray<ShiftType> {
  return [...shiftTypes].sort((left, right) => {
    const startTimeComparison = left.startTime.localeCompare(right.startTime);
    return startTimeComparison !== 0
      ? startTimeComparison
      : left.code.localeCompare(right.code);
  });
}

export class LocalStorageShiftTypeRepository implements ShiftTypeRepository {
  private readonly storageKey: string;
  private readonly seedData: ReadonlyArray<ShiftType>;

  constructor(options: BrowserStorageRepositoryOptions<ShiftType> = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEYS.shiftTypes;
    this.seedData = options.seedData ?? [];
  }

  async create(shiftType: ShiftType): Promise<ShiftType> {
    const entries = this.readEntries();
    this.assertUniqueConstraints(shiftType, entries);
    entries.push(cloneShiftType(shiftType));
    this.writeEntries(entries);
    return cloneShiftType(shiftType);
  }

  async update(id: string, changes: Partial<ShiftType>): Promise<ShiftType> {
    const entries = this.readEntries();
    const existingShiftType = entries.find((entry) => entry.id === id);

    if (!existingShiftType) {
      throw new RepositoryNotFoundError(`Shift type '${id}' was not found.`);
    }

    const nextShiftType: ShiftType = {
      ...existingShiftType,
      ...changes,
      id: existingShiftType.id,
      createdAt: existingShiftType.createdAt,
      updatedAt: changes.updatedAt ?? existingShiftType.updatedAt
    };

    this.assertUniqueConstraints(nextShiftType, entries);
    const nextEntries = entries.filter((entry) => entry.id !== id);
    nextEntries.push(cloneShiftType(nextShiftType));
    this.writeEntries(nextEntries);
    return cloneShiftType(nextShiftType);
  }

  async delete(id: string): Promise<void> {
    const entries = this.readEntries();
    const nextEntries = entries.filter((entry) => entry.id !== id);

    if (nextEntries.length === entries.length) {
      throw new RepositoryNotFoundError(`Shift type '${id}' was not found.`);
    }

    this.writeEntries(nextEntries);
  }

  async getById(id: string): Promise<ShiftType | null> {
    const shiftType = this.readEntries().find((entry) => entry.id === id);
    return shiftType ? cloneShiftType(shiftType) : null;
  }

  async listActive(
    filter?: Omit<ShiftTypeRepositoryFilter, "isActive">
  ): Promise<ReadonlyArray<ShiftType>> {
    return this.listAll({
      ...filter,
      isActive: true
    });
  }

  async listAll(
    filter?: ShiftTypeRepositoryFilter
  ): Promise<ReadonlyArray<ShiftType>> {
    const shiftTypes = this.readEntries().filter((shiftType) => {
      if (
        filter?.isActive !== undefined &&
        shiftType.isActive !== filter.isActive
      ) {
        return false;
      }

      if (
        filter?.category !== undefined &&
        shiftType.category !== filter.category
      ) {
        return false;
      }

      return true;
    });

    return sortShiftTypes(shiftTypes).map(cloneShiftType);
  }

  private readEntries(): ShiftType[] {
    return readCollectionFromStorage(this.storageKey, this.seedData).map(
      cloneShiftType
    );
  }

  private writeEntries(entries: ReadonlyArray<ShiftType>): void {
    writeCollectionToStorage(
      this.storageKey,
      sortShiftTypes(entries).map(cloneShiftType)
    );
  }

  private assertUniqueConstraints(
    candidate: ShiftType,
    entries: ReadonlyArray<ShiftType>
  ): void {
    for (const existingShiftType of entries) {
      if (existingShiftType.id === candidate.id) {
        continue;
      }

      if (existingShiftType.code === candidate.code) {
        throw new RepositoryConflictError(
          `Shift type code '${candidate.code}' is already in use.`
        );
      }
    }
  }
}
