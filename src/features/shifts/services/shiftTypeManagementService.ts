import type {
  EntityId,
  ShiftKind,
  ShiftType,
  TimeOfDayString
} from "@/domain/models";
import type { ShiftTypeRepository } from "@/domain/repositories";
import { RepositoryNotFoundError } from "@/domain/repositories";

export interface ListShiftTypesFilter {
  readonly isActive?: boolean;
  readonly defaultKind?: ShiftKind;
}

export interface CreateShiftTypeInput {
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
  readonly defaultKind: ShiftKind;
}

export interface UpdateShiftTypeInput {
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
  readonly defaultKind: ShiftKind;
}

export interface ShiftTypeManagementService {
  listShiftTypes(filter?: ListShiftTypesFilter): Promise<ReadonlyArray<ShiftType>>;
  createShiftType(input: CreateShiftTypeInput): Promise<ShiftType>;
  updateShiftType(shiftTypeId: EntityId, input: UpdateShiftTypeInput): Promise<ShiftType>;
  deactivateShiftType(shiftTypeId: EntityId): Promise<ShiftType>;
}

export interface ShiftTypeManagementServiceDependencies {
  readonly shiftTypeRepository: ShiftTypeRepository;
}

export function createShiftTypeManagementService(
  dependencies: ShiftTypeManagementServiceDependencies
): ShiftTypeManagementService {
  return {
    async listShiftTypes(filter) {
      return dependencies.shiftTypeRepository.list(filter);
    },
    async createShiftType(input) {
      const timestamp = new Date().toISOString();

      return dependencies.shiftTypeRepository.save({
        id: crypto.randomUUID(),
        code: input.code,
        label: input.label,
        startTime: input.startTime,
        endTime: input.endTime,
        defaultKind: input.defaultKind,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async updateShiftType(shiftTypeId, input) {
      const existingShiftType =
        await dependencies.shiftTypeRepository.findById(shiftTypeId);

      if (!existingShiftType) {
        throw new RepositoryNotFoundError(
          `Shift type '${shiftTypeId}' was not found.`
        );
      }

      return dependencies.shiftTypeRepository.save({
        ...existingShiftType,
        code: input.code,
        label: input.label,
        startTime: input.startTime,
        endTime: input.endTime,
        defaultKind: input.defaultKind,
        updatedAt: new Date().toISOString()
      });
    },
    async deactivateShiftType(shiftTypeId) {
      const existingShiftType =
        await dependencies.shiftTypeRepository.findById(shiftTypeId);

      if (!existingShiftType) {
        throw new RepositoryNotFoundError(
          `Shift type '${shiftTypeId}' was not found.`
        );
      }

      if (!existingShiftType.isActive) {
        return existingShiftType;
      }

      return dependencies.shiftTypeRepository.save({
        ...existingShiftType,
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    }
  };
}
