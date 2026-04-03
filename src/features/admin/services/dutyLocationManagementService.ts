import {
  DEFAULT_DUTY_LOCATION_ID,
  type ActorRole,
  type DutyLocation,
  type EntityId
} from "@/domain/models";
import type {
  BiasCriteriaRepository,
  DutyLocationRepository,
  RosterSnapshotRepository
} from "@/domain/repositories";
import {
  LocationInUseError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { validateDutyLocationInput } from "@/features/admin/services/dutyLocationManagementValidation";

export interface DutyLocationActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface CreateDutyLocationInput extends DutyLocationActorInput {
  readonly code: string;
  readonly label: string;
  readonly description?: string;
}

export interface UpdateDutyLocationInput extends DutyLocationActorInput {
  readonly id: EntityId;
  readonly code: string;
  readonly label: string;
  readonly description?: string;
  readonly isActive: boolean;
}

export interface SetDutyLocationActiveInput extends DutyLocationActorInput {
  readonly id: EntityId;
  readonly isActive: boolean;
}

export interface DutyLocationManagementService {
  getLocationList(): Promise<ReadonlyArray<DutyLocation>>;
  createLocation(input: CreateDutyLocationInput): Promise<DutyLocation>;
  updateLocation(input: UpdateDutyLocationInput): Promise<DutyLocation>;
  setLocationActive(input: SetDutyLocationActiveInput): Promise<DutyLocation>;
  deleteLocation(input: DutyLocationActorInput & { readonly id: EntityId }): Promise<void>;
}

export interface DutyLocationManagementServiceDependencies {
  readonly dutyLocationRepository: DutyLocationRepository;
  readonly biasCriteriaRepository: BiasCriteriaRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
  readonly auditLogService: AuditLogService;
}

async function appendLocationAuditLog(
  dependencies: DutyLocationManagementServiceDependencies,
  input: {
    readonly actionType:
      | "DUTY_LOCATION_CREATED"
      | "DUTY_LOCATION_UPDATED"
      | "DUTY_LOCATION_ACTIVATED"
      | "DUTY_LOCATION_DEACTIVATED"
      | "DUTY_LOCATION_DELETED"
      | "DUTY_LOCATION_DELETE_BLOCKED";
    readonly location: DutyLocation;
    readonly actorId: EntityId;
    readonly actorRole: ActorRole;
    readonly details: Readonly<Record<string, unknown>>;
  }
) {
  await dependencies.auditLogService.appendLog({
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: "DUTY_LOCATION",
    entityId: input.location.id,
    details: input.details
  });
}

async function loadLocationOrThrow(
  dutyLocationRepository: DutyLocationRepository,
  locationId: EntityId
): Promise<DutyLocation> {
  const location = await dutyLocationRepository.getById(locationId);

  if (!location) {
    throw new RepositoryNotFoundError(`Duty location '${locationId}' was not found.`);
  }

  return location;
}

async function assertLocationCodeAvailable(
  dutyLocationRepository: DutyLocationRepository,
  code: string,
  currentLocationId?: EntityId
): Promise<void> {
  const locations = await dutyLocationRepository.listAll();
  const conflict = locations.find(
    (location) =>
      location.code.toUpperCase() === code.toUpperCase() &&
      location.id !== currentLocationId
  );

  if (conflict) {
    throw new Error(`Duty location code '${code}' is already in use.`);
  }
}

async function assertLocationCanBeDisabledOrDeleted(
  dependencies: DutyLocationManagementServiceDependencies,
  location: DutyLocation,
  action: "deactivate" | "delete"
): Promise<void> {
  if (location.id === DEFAULT_DUTY_LOCATION_ID) {
    throw new LocationInUseError(
      "The default duty location is currently required by roster generation and cannot be disabled or deleted."
    );
  }

  if (action === "delete") {
    const [criteria, snapshots] = await Promise.all([
      dependencies.biasCriteriaRepository.listAll(),
      dependencies.rosterSnapshotRepository.list()
    ]);
    const referencedCriteria = criteria.filter((entry) =>
      entry.locationIds.includes(location.id)
    );
    const snapshotUsageCount = snapshots.filter((snapshot) =>
      snapshot.shifts.some((shift) => shift.locationId === location.id)
    ).length;

    if (referencedCriteria.length > 0 || snapshotUsageCount > 0) {
      const blockers: string[] = [];
      if (referencedCriteria.length > 0) {
        blockers.push(
          `it is referenced by ${referencedCriteria.length} bias criteria record(s)`
        );
      }
      if (snapshotUsageCount > 0) {
        blockers.push(
          `it is referenced by ${snapshotUsageCount} saved roster snapshot(s)`
        );
      }

      throw new LocationInUseError(
        `Cannot delete location '${location.label}' because ${blockers.join(" and ")}.`
      );
    }
  }
}

export function createDutyLocationManagementService(
  dependencies: DutyLocationManagementServiceDependencies
): DutyLocationManagementService {
  return {
    async getLocationList() {
      return dependencies.dutyLocationRepository.listAll();
    },
    async createLocation(input) {
      const normalizedInput = validateDutyLocationInput(input);
      await assertLocationCodeAvailable(
        dependencies.dutyLocationRepository,
        normalizedInput.code
      );
      const timestamp = new Date().toISOString();

      const location = await dependencies.dutyLocationRepository.create({
        id: crypto.randomUUID(),
        code: normalizedInput.code,
        label: normalizedInput.label,
        description: normalizedInput.description,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      await appendLocationAuditLog(dependencies, {
        actionType: "DUTY_LOCATION_CREATED",
        location,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: location.code,
          label: location.label,
          isActive: location.isActive
        }
      });

      return location;
    },
    async updateLocation(input) {
      const location = await loadLocationOrThrow(
        dependencies.dutyLocationRepository,
        input.id
      );
      const normalizedInput = validateDutyLocationInput(input);
      await assertLocationCodeAvailable(
        dependencies.dutyLocationRepository,
        normalizedInput.code,
        location.id
      );

      if (!input.isActive) {
        await assertLocationCanBeDisabledOrDeleted(dependencies, location, "deactivate");
      }

      const updatedLocation = await dependencies.dutyLocationRepository.update(location.id, {
        code: normalizedInput.code,
        label: normalizedInput.label,
        description: normalizedInput.description,
        isActive: input.isActive,
        updatedAt: new Date().toISOString()
      });

      const changedFields: string[] = [];
      if (location.code !== updatedLocation.code) {
        changedFields.push("code");
      }
      if (location.label !== updatedLocation.label) {
        changedFields.push("label");
      }
      if ((location.description ?? "") !== (updatedLocation.description ?? "")) {
        changedFields.push("description");
      }

      if (changedFields.length > 0) {
        await appendLocationAuditLog(dependencies, {
          actionType: "DUTY_LOCATION_UPDATED",
          location: updatedLocation,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            changedFields,
            before: {
              code: location.code,
              label: location.label,
              description: location.description ?? null
            },
            after: {
              code: updatedLocation.code,
              label: updatedLocation.label,
              description: updatedLocation.description ?? null
            }
          }
        });
      }

      if (location.isActive !== updatedLocation.isActive) {
        await appendLocationAuditLog(dependencies, {
          actionType: updatedLocation.isActive
            ? "DUTY_LOCATION_ACTIVATED"
            : "DUTY_LOCATION_DEACTIVATED",
          location: updatedLocation,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            previousStatus: location.isActive ? "ACTIVE" : "INACTIVE",
            nextStatus: updatedLocation.isActive ? "ACTIVE" : "INACTIVE"
          }
        });
      }

      return updatedLocation;
    },
    async setLocationActive(input) {
      const location = await loadLocationOrThrow(
        dependencies.dutyLocationRepository,
        input.id
      );

      if (location.isActive === input.isActive) {
        return location;
      }

      if (!input.isActive) {
        await assertLocationCanBeDisabledOrDeleted(dependencies, location, "deactivate");
      }

      const updatedLocation = await dependencies.dutyLocationRepository.update(location.id, {
        isActive: input.isActive,
        updatedAt: new Date().toISOString()
      });

      await appendLocationAuditLog(dependencies, {
        actionType: updatedLocation.isActive
          ? "DUTY_LOCATION_ACTIVATED"
          : "DUTY_LOCATION_DEACTIVATED",
        location: updatedLocation,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          previousStatus: location.isActive ? "ACTIVE" : "INACTIVE",
          nextStatus: updatedLocation.isActive ? "ACTIVE" : "INACTIVE"
        }
      });

      return updatedLocation;
    },
    async deleteLocation(input) {
      const location = await loadLocationOrThrow(
        dependencies.dutyLocationRepository,
        input.id
      );

      try {
        await assertLocationCanBeDisabledOrDeleted(dependencies, location, "delete");
      } catch (error) {
        await appendLocationAuditLog(dependencies, {
          actionType: "DUTY_LOCATION_DELETE_BLOCKED",
          location,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            message: error instanceof Error ? error.message : "Location delete blocked."
          }
        });
        throw error;
      }

      await dependencies.dutyLocationRepository.delete(location.id);
      await appendLocationAuditLog(dependencies, {
        actionType: "DUTY_LOCATION_DELETED",
        location,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: location.code,
          label: location.label
        }
      });
    }
  };
}
