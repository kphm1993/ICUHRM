import type {
  ActorRole,
  EntityId,
  ShiftKind,
  ShiftType,
  TimeOfDayString
} from "@/domain/models";
import type {
  BiasCriteriaRepository,
  DutyDesignRepository,
  RosterSnapshotRepository,
  ShiftTypeRepository
} from "@/domain/repositories";
import {
  EntityInUseError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import { assertAdminActorRole } from "@/features/admin/services/assertAdminActorRole";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  logShiftTypeActivated,
  logShiftTypeCreated,
  logShiftTypeDeactivated,
  logShiftTypeDeleteBlocked,
  logShiftTypeDeleted,
  logShiftTypeUpdated
} from "@/features/audit/services/lifecycleAuditLogging";
import {
  ShiftTypeValidationError,
  validateShiftTypeInput
} from "@/features/shifts/services/shiftTypeManagementValidation";

export interface ListShiftTypesFilter {
  readonly isActive?: boolean;
  readonly category?: ShiftKind;
}

export interface ShiftTypeActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface CreateShiftTypeInput extends ShiftTypeActorInput {
  readonly code: string;
  readonly label: string;
  readonly startTime: TimeOfDayString;
  readonly endTime: TimeOfDayString;
  readonly category: ShiftKind;
  readonly isActive: boolean;
}

export interface UpdateShiftTypeInput extends CreateShiftTypeInput {
  readonly id: EntityId;
}

export interface ShiftTypeManagementService {
  listShiftTypes(filter?: ListShiftTypesFilter): Promise<ReadonlyArray<ShiftType>>;
  createShiftType(input: CreateShiftTypeInput): Promise<ShiftType>;
  updateShiftType(input: UpdateShiftTypeInput): Promise<ShiftType>;
  deleteShiftType(input: ShiftTypeActorInput & { readonly id: EntityId }): Promise<void>;
}

export interface ShiftTypeManagementServiceDependencies {
  readonly shiftTypeRepository: ShiftTypeRepository;
  readonly dutyDesignRepository: DutyDesignRepository;
  readonly biasCriteriaRepository: BiasCriteriaRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
  readonly auditLogService: AuditLogService;
}

async function loadShiftTypeOrThrow(
  shiftTypeRepository: ShiftTypeRepository,
  shiftTypeId: EntityId
): Promise<ShiftType> {
  const shiftType = await shiftTypeRepository.getById(shiftTypeId);

  if (!shiftType) {
    throw new RepositoryNotFoundError(
      `Shift type '${shiftTypeId}' was not found.`
    );
  }

  return shiftType;
}

async function assertShiftTypeCodeAvailable(
  shiftTypeRepository: ShiftTypeRepository,
  code: string,
  currentShiftTypeId?: EntityId
): Promise<void> {
  const conflict = (await shiftTypeRepository.listAll()).find(
    (shiftType) =>
      shiftType.code.toUpperCase() === code.toUpperCase() &&
      shiftType.id !== currentShiftTypeId
  );

  if (conflict) {
    throw new ShiftTypeValidationError({
      code: `Shift type code '${code}' is already in use.`
    });
  }
}

async function assertShiftTypeCanBeDeleted(
  dependencies: ShiftTypeManagementServiceDependencies,
  shiftType: ShiftType
): Promise<void> {
  const [dutyDesigns, biasCriteriaEntries, snapshots] = await Promise.all([
    dependencies.dutyDesignRepository.listAll(),
    dependencies.biasCriteriaRepository.listAll(),
    dependencies.rosterSnapshotRepository.list()
  ]);
  const referencingDesign = dutyDesigns.find((design) =>
    design.dutyBlocks.some((block) => block.shiftTypeId === shiftType.id)
  );

  if (referencingDesign) {
    throw new EntityInUseError(
      `Cannot delete shift type '${shiftType.label}' because it is referenced by duty design '${referencingDesign.label}'.`
    );
  }

  const referencingCriteria = biasCriteriaEntries.find((criteria) =>
    criteria.shiftTypeIds.includes(shiftType.id)
  );

  if (referencingCriteria) {
    throw new EntityInUseError(
      `Cannot delete shift type '${shiftType.label}' because it is referenced by bias criteria '${referencingCriteria.label}'.`
    );
  }

  const referencingSnapshot = snapshots.find((snapshot) =>
    snapshot.shifts.some((shift) => shift.shiftTypeId === shiftType.id)
  );

  if (referencingSnapshot) {
    throw new EntityInUseError(
      `Cannot delete shift type '${shiftType.label}' because it is referenced by saved roster month '${referencingSnapshot.generatedInputSummary.rosterMonth}'.`
    );
  }
}

export function createShiftTypeManagementService(
  dependencies: ShiftTypeManagementServiceDependencies
): ShiftTypeManagementService {
  return {
    async listShiftTypes(filter) {
      if (filter?.isActive === true) {
        return dependencies.shiftTypeRepository.listActive({
          category: filter.category
        });
      }

      return dependencies.shiftTypeRepository.listAll(filter);
    },
    async createShiftType(input) {
      assertAdminActorRole(input.actorRole, "Only admins can manage shift types.");
      const normalizedInput = validateShiftTypeInput(input);
      await assertShiftTypeCodeAvailable(
        dependencies.shiftTypeRepository,
        normalizedInput.code
      );
      const timestamp = new Date().toISOString();
      const shiftType = await dependencies.shiftTypeRepository.create({
        id: crypto.randomUUID(),
        code: normalizedInput.code,
        label: normalizedInput.label,
        startTime: normalizedInput.startTime,
        endTime: normalizedInput.endTime,
        category: normalizedInput.category,
        isActive: input.isActive,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      await logShiftTypeCreated(dependencies.auditLogService, {
        shiftType,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: shiftType.code,
          label: shiftType.label,
          startTime: shiftType.startTime,
          endTime: shiftType.endTime,
          category: shiftType.category,
          isActive: shiftType.isActive
        }
      });

      return shiftType;
    },
    async updateShiftType(input) {
      assertAdminActorRole(input.actorRole, "Only admins can manage shift types.");
      const existingShiftType = await loadShiftTypeOrThrow(
        dependencies.shiftTypeRepository,
        input.id
      );
      const normalizedInput = validateShiftTypeInput(input);
      await assertShiftTypeCodeAvailable(
        dependencies.shiftTypeRepository,
        normalizedInput.code,
        existingShiftType.id
      );

      const updatedShiftType = await dependencies.shiftTypeRepository.update(
        existingShiftType.id,
        {
        code: normalizedInput.code,
        label: normalizedInput.label,
        startTime: normalizedInput.startTime,
        endTime: normalizedInput.endTime,
        category: normalizedInput.category,
        isActive: input.isActive,
        updatedAt: new Date().toISOString()
        }
      );

      const changedFields: string[] = [];
      if (existingShiftType.code !== updatedShiftType.code) {
        changedFields.push("code");
      }
      if (existingShiftType.label !== updatedShiftType.label) {
        changedFields.push("label");
      }
      if (existingShiftType.startTime !== updatedShiftType.startTime) {
        changedFields.push("startTime");
      }
      if (existingShiftType.endTime !== updatedShiftType.endTime) {
        changedFields.push("endTime");
      }
      if (existingShiftType.category !== updatedShiftType.category) {
        changedFields.push("category");
      }

      if (changedFields.length > 0) {
        await logShiftTypeUpdated(dependencies.auditLogService, {
          shiftType: updatedShiftType,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            changedFields,
            before: {
              code: existingShiftType.code,
              label: existingShiftType.label,
              startTime: existingShiftType.startTime,
              endTime: existingShiftType.endTime,
              category: existingShiftType.category
            },
            after: {
              code: updatedShiftType.code,
              label: updatedShiftType.label,
              startTime: updatedShiftType.startTime,
              endTime: updatedShiftType.endTime,
              category: updatedShiftType.category
            }
          }
        });
      }

      if (existingShiftType.isActive !== updatedShiftType.isActive) {
        await (
          updatedShiftType.isActive
            ? logShiftTypeActivated
            : logShiftTypeDeactivated
        )(dependencies.auditLogService, {
          shiftType: updatedShiftType,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            previousStatus: existingShiftType.isActive ? "ACTIVE" : "INACTIVE",
            nextStatus: updatedShiftType.isActive ? "ACTIVE" : "INACTIVE"
          }
        });
      }

      return updatedShiftType;
    },
    async deleteShiftType(input) {
      assertAdminActorRole(input.actorRole, "Only admins can manage shift types.");
      const shiftType = await loadShiftTypeOrThrow(
        dependencies.shiftTypeRepository,
        input.id
      );

      try {
        await assertShiftTypeCanBeDeleted(dependencies, shiftType);
      } catch (error) {
        await logShiftTypeDeleteBlocked(dependencies.auditLogService, {
          shiftType,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            message:
              error instanceof Error
                ? error.message
                : "Shift type delete blocked."
          }
        });
        throw error;
      }

      await dependencies.shiftTypeRepository.delete(shiftType.id);

      await logShiftTypeDeleted(dependencies.auditLogService, {
        shiftType,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: shiftType.code,
          label: shiftType.label
        }
      });
    }
  };
}
