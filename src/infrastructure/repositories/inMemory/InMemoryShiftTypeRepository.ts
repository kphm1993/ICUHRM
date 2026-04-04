import type { ShiftType } from "@/domain/models";
import type {
  ShiftTypeRepository,
  ShiftTypeRepositoryFilter
} from "@/domain/repositories";
import {
  RepositoryConflictError,
  RepositoryNotFoundError
} from "@/domain/repositories";

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

export class InMemoryShiftTypeRepository implements ShiftTypeRepository {
  private readonly shiftTypesById = new Map<string, ShiftType>();

  constructor(seedData: ReadonlyArray<ShiftType> = []) {
    for (const shiftType of seedData) {
      this.assertUniqueConstraints(shiftType);
      this.shiftTypesById.set(shiftType.id, cloneShiftType(shiftType));
    }
  }

  async create(shiftType: ShiftType): Promise<ShiftType> {
    this.assertUniqueConstraints(shiftType);
    this.shiftTypesById.set(shiftType.id, cloneShiftType(shiftType));
    return cloneShiftType(shiftType);
  }

  async update(
    id: string,
    changes: Partial<ShiftType>
  ): Promise<ShiftType> {
    const existingShiftType = this.shiftTypesById.get(id);

    if (!existingShiftType) {
      throw new RepositoryNotFoundError(`Shift type '${id}' was not found.`);
    }

    const nextShiftType: ShiftType = {
      ...existingShiftType,
      ...changes,
      id: existingShiftType.id,
      createdAt: existingShiftType.createdAt,
      updatedAt: changes.updatedAt ?? new Date().toISOString()
    };

    this.assertUniqueConstraints(nextShiftType);
    this.shiftTypesById.set(id, cloneShiftType(nextShiftType));
    return cloneShiftType(nextShiftType);
  }

  async delete(id: string): Promise<void> {
    const wasDeleted = this.shiftTypesById.delete(id);

    if (!wasDeleted) {
      throw new RepositoryNotFoundError(`Shift type '${id}' was not found.`);
    }
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
    const shiftTypes = Array.from(this.shiftTypesById.values()).filter((shiftType) => {
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

  async getById(id: string): Promise<ShiftType | null> {
    const shiftType = this.shiftTypesById.get(id);
    return shiftType ? cloneShiftType(shiftType) : null;
  }

  private assertUniqueConstraints(candidate: ShiftType): void {
    for (const existingShiftType of this.shiftTypesById.values()) {
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
