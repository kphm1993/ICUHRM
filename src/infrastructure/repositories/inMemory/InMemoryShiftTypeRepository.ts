import type { ShiftType } from "@/domain/models";
import type {
  ShiftTypeRepository,
  ShiftTypeRepositoryFilter
} from "@/domain/repositories";
import { RepositoryConflictError } from "@/domain/repositories";

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

  async list(filter?: ShiftTypeRepositoryFilter): Promise<ReadonlyArray<ShiftType>> {
    const shiftTypes = Array.from(this.shiftTypesById.values()).filter((shiftType) => {
      if (
        filter?.isActive !== undefined &&
        shiftType.isActive !== filter.isActive
      ) {
        return false;
      }

      if (
        filter?.defaultKind !== undefined &&
        shiftType.defaultKind !== filter.defaultKind
      ) {
        return false;
      }

      return true;
    });

    return sortShiftTypes(shiftTypes).map(cloneShiftType);
  }

  async findById(id: string): Promise<ShiftType | null> {
    const shiftType = this.shiftTypesById.get(id);
    return shiftType ? cloneShiftType(shiftType) : null;
  }

  async findByCode(code: string): Promise<ShiftType | null> {
    const shiftType = Array.from(this.shiftTypesById.values()).find(
      (entry) => entry.code === code
    );

    return shiftType ? cloneShiftType(shiftType) : null;
  }

  async save(shiftType: ShiftType): Promise<ShiftType> {
    this.assertUniqueConstraints(shiftType);
    this.shiftTypesById.set(shiftType.id, cloneShiftType(shiftType));
    return cloneShiftType(shiftType);
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

