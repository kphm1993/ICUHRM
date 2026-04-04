import type {
  ActorRole,
  DutyDesign,
  DutyDesignBlock,
  DutyLocation,
  EntityId,
  ShiftType
} from "@/domain/models";
import type {
  DutyDesignAssignmentRepository,
  DutyDesignRepository,
  DutyLocationRepository,
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
  logDutyDesignActivated,
  logDutyDesignCreated,
  logDutyDesignDeactivated,
  logDutyDesignDeleteBlocked,
  logDutyDesignDeleted,
  logDutyDesignUpdated
} from "@/features/audit/services/lifecycleAuditLogging";
import type { DutyDesignBlockInput } from "@/features/dutyDesigns/services/dutyDesignManagementValidation";
import {
  DutyDesignValidationError,
  validateDutyDesignInput
} from "@/features/dutyDesigns/services/dutyDesignManagementValidation";

export interface DutyDesignListFilter {
  readonly isActive?: boolean;
}

export interface DutyDesignActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface CreateDutyDesignInput extends DutyDesignActorInput {
  readonly code: string;
  readonly label: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly isHolidayDesign: boolean;
  readonly dutyBlocks: ReadonlyArray<DutyDesignBlockInput>;
}

export interface UpdateDutyDesignInput extends CreateDutyDesignInput {
  readonly id: EntityId;
}

export interface DutyDesignManagementService {
  listDutyDesigns(filter?: DutyDesignListFilter): Promise<ReadonlyArray<DutyDesign>>;
  createDutyDesign(input: CreateDutyDesignInput): Promise<DutyDesign>;
  updateDutyDesign(input: UpdateDutyDesignInput): Promise<DutyDesign>;
  deleteDutyDesign(input: DutyDesignActorInput & { readonly id: EntityId }): Promise<void>;
}

export interface DutyDesignManagementServiceDependencies {
  readonly dutyDesignRepository: DutyDesignRepository;
  readonly dutyDesignAssignmentRepository: DutyDesignAssignmentRepository;
  readonly shiftTypeRepository: ShiftTypeRepository;
  readonly dutyLocationRepository: DutyLocationRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
  readonly auditLogService: AuditLogService;
}

async function loadDutyDesignOrThrow(
  dutyDesignRepository: DutyDesignRepository,
  dutyDesignId: EntityId
): Promise<DutyDesign> {
  const dutyDesign = await dutyDesignRepository.getById(dutyDesignId);

  if (!dutyDesign) {
    throw new RepositoryNotFoundError(
      `Duty design '${dutyDesignId}' was not found.`
    );
  }

  return dutyDesign;
}

async function assertDutyDesignCodeAvailable(
  dutyDesignRepository: DutyDesignRepository,
  code: string,
  currentDutyDesignId?: EntityId
): Promise<void> {
  const conflict = (await dutyDesignRepository.listAll()).find(
    (design) =>
      design.code.toUpperCase() === code.toUpperCase() &&
      design.id !== currentDutyDesignId
  );

  if (conflict) {
    throw new DutyDesignValidationError({
      code: `Duty design code '${code}' is already in use.`
    });
  }
}

function assertActiveShiftType(
  shiftTypeId: EntityId,
  shiftTypesById: ReadonlyMap<EntityId, ShiftType>
): void {
  const shiftType = shiftTypesById.get(shiftTypeId);

  if (!shiftType) {
    throw new DutyDesignValidationError({
      dutyBlocks: `Duty block references unknown shift type '${shiftTypeId}'.`
    });
  }

  if (!shiftType.isActive) {
    throw new DutyDesignValidationError({
      dutyBlocks: `Duty block references inactive shift type '${shiftType.label}'.`
    });
  }
}

function assertActiveLocation(
  locationId: EntityId | undefined,
  locationsById: ReadonlyMap<EntityId, DutyLocation>
): void {
  if (!locationId) {
    return;
  }

  const location = locationsById.get(locationId);

  if (!location) {
    throw new DutyDesignValidationError({
      dutyBlocks: `Duty block references unknown location '${locationId}'.`
    });
  }

  if (!location.isActive) {
    throw new DutyDesignValidationError({
      dutyBlocks: `Duty block references inactive location '${location.label}'.`
    });
  }
}

function assertFollowUpExists(
  followUpDutyDesignId: EntityId | undefined,
  designsById: ReadonlyMap<EntityId, DutyDesign>,
  candidateDutyDesignId: EntityId
): void {
  if (!followUpDutyDesignId) {
    return;
  }

  if (followUpDutyDesignId === candidateDutyDesignId) {
    throw new DutyDesignValidationError({
      dutyBlocks: "Duty designs cannot follow up to themselves."
    });
  }

  if (!designsById.has(followUpDutyDesignId)) {
    throw new DutyDesignValidationError({
      dutyBlocks: `Duty block references unknown follow-up duty design '${followUpDutyDesignId}'.`
    });
  }
}

function buildDesignGraph(
  designs: ReadonlyArray<DutyDesign>
): ReadonlyMap<EntityId, ReadonlyArray<EntityId>> {
  return new Map(
    designs.map((design) => [
      design.id,
      design.dutyBlocks
        .map((block) => block.followUpDutyDesignId)
        .filter((entry): entry is EntityId => entry !== undefined)
    ])
  );
}

function assertDesignGraphIsAcyclic(designs: ReadonlyArray<DutyDesign>): void {
  const graph = buildDesignGraph(designs);
  const visited = new Set<EntityId>();
  const visiting = new Set<EntityId>();

  function visit(designId: EntityId): boolean {
    if (visiting.has(designId)) {
      return true;
    }

    if (visited.has(designId)) {
      return false;
    }

    visiting.add(designId);

    for (const nextDesignId of graph.get(designId) ?? []) {
      if (visit(nextDesignId)) {
        return true;
      }
    }

    visiting.delete(designId);
    visited.add(designId);
    return false;
  }

  for (const designId of graph.keys()) {
    if (visit(designId)) {
      throw new DutyDesignValidationError({
        dutyBlocks: "Duty design follow-up chain cannot contain cycles."
      });
    }
  }
}

async function assertDutyBlocksAreValid(
  dependencies: DutyDesignManagementServiceDependencies,
  dutyBlocks: ReadonlyArray<DutyDesignBlock>,
  candidateDutyDesignId: EntityId,
  currentDutyDesignId?: EntityId
): Promise<void> {
  const [shiftTypes, locations, dutyDesigns] = await Promise.all([
    dependencies.shiftTypeRepository.listAll(),
    dependencies.dutyLocationRepository.listAll(),
    dependencies.dutyDesignRepository.listAll()
  ]);
  const shiftTypesById = new Map(shiftTypes.map((entry) => [entry.id, entry]));
  const locationsById = new Map(locations.map((entry) => [entry.id, entry]));
  const dutyDesignsById = new Map(dutyDesigns.map((entry) => [entry.id, entry]));

  for (const dutyBlock of dutyBlocks) {
    assertActiveShiftType(dutyBlock.shiftTypeId, shiftTypesById);
    assertActiveLocation(dutyBlock.locationId, locationsById);
    assertFollowUpExists(
      dutyBlock.followUpDutyDesignId,
      dutyDesignsById,
      candidateDutyDesignId
    );
  }

  const candidateDesign: DutyDesign = {
    id: candidateDutyDesignId,
    code: "",
    label: "",
    isActive: true,
    isHolidayDesign: false,
    dutyBlocks,
    createdAt: "",
    updatedAt: ""
  };
  const nextDutyDesigns = currentDutyDesignId
    ? dutyDesigns.map((design) =>
        design.id === currentDutyDesignId
          ? { ...design, dutyBlocks }
          : design
      )
    : [...dutyDesigns, candidateDesign];

  assertDesignGraphIsAcyclic(nextDutyDesigns);
}

async function assertDutyDesignCanBeDeleted(
  dependencies: DutyDesignManagementServiceDependencies,
  dutyDesign: DutyDesign
): Promise<void> {
  const [assignments, dutyDesigns, snapshots] = await Promise.all([
    dependencies.dutyDesignAssignmentRepository.listAll(),
    dependencies.dutyDesignRepository.listAll(),
    dependencies.rosterSnapshotRepository.list()
  ]);

  if (assignments.some((assignment) => assignment.dutyDesignId === dutyDesign.id)) {
    throw new EntityInUseError(
      `Cannot delete duty design '${dutyDesign.label}' because it is assigned to one or more dates.`
    );
  }

  const referencingDesign = dutyDesigns.find(
    (design) =>
      design.id !== dutyDesign.id &&
      design.dutyBlocks.some(
        (block) => block.followUpDutyDesignId === dutyDesign.id
      )
  );

  if (referencingDesign) {
    throw new EntityInUseError(
      `Cannot delete duty design '${dutyDesign.label}' because it is referenced by duty design '${referencingDesign.label}'.`
    );
  }

  const referencingSnapshot = snapshots.find(
    (snapshot) =>
      snapshot.generatedInputSummary.dutyDesignSnapshot[dutyDesign.id] !== undefined
  );

  if (referencingSnapshot) {
    throw new EntityInUseError(
      `Cannot delete duty design '${dutyDesign.label}' because it is referenced by saved roster month '${referencingSnapshot.generatedInputSummary.rosterMonth}'.`
    );
  }
}

export function createDutyDesignManagementService(
  dependencies: DutyDesignManagementServiceDependencies
): DutyDesignManagementService {
  return {
    async listDutyDesigns(filter) {
      const dutyDesigns =
        filter?.isActive === true
          ? await dependencies.dutyDesignRepository.listActive()
          : await dependencies.dutyDesignRepository.listAll();

      return filter?.isActive === false
        ? dutyDesigns.filter((design) => !design.isActive)
        : dutyDesigns;
    },
    async createDutyDesign(input) {
      assertAdminActorRole(input.actorRole, "Only admins can manage duty designs.");
      const normalizedInput = validateDutyDesignInput({
        ...input
      });
      await assertDutyDesignCodeAvailable(
        dependencies.dutyDesignRepository,
        normalizedInput.code
      );
      const timestamp = new Date().toISOString();
      const dutyDesignId = crypto.randomUUID();
      await assertDutyBlocksAreValid(
        dependencies,
        normalizedInput.dutyBlocks,
        dutyDesignId
      );

      const dutyDesign = await dependencies.dutyDesignRepository.create({
        id: dutyDesignId,
        code: normalizedInput.code,
        label: normalizedInput.label,
        description: normalizedInput.description,
        isActive: normalizedInput.isActive,
        isHolidayDesign: normalizedInput.isHolidayDesign,
        dutyBlocks: normalizedInput.dutyBlocks,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      await logDutyDesignCreated(dependencies.auditLogService, {
        dutyDesign,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: dutyDesign.code,
          label: dutyDesign.label,
          isHolidayDesign: dutyDesign.isHolidayDesign,
          isActive: dutyDesign.isActive,
          dutyBlockCount: dutyDesign.dutyBlocks.length
        }
      });

      return dutyDesign;
    },
    async updateDutyDesign(input) {
      assertAdminActorRole(input.actorRole, "Only admins can manage duty designs.");
      const existingDutyDesign = await loadDutyDesignOrThrow(
        dependencies.dutyDesignRepository,
        input.id
      );
      const normalizedInput = validateDutyDesignInput(input);
      await assertDutyDesignCodeAvailable(
        dependencies.dutyDesignRepository,
        normalizedInput.code,
        existingDutyDesign.id
      );
      await assertDutyBlocksAreValid(
        dependencies,
        normalizedInput.dutyBlocks,
        existingDutyDesign.id,
        existingDutyDesign.id
      );

      const updatedDutyDesign = await dependencies.dutyDesignRepository.update(
        existingDutyDesign.id,
        {
        code: normalizedInput.code,
        label: normalizedInput.label,
        description: normalizedInput.description,
        isActive: normalizedInput.isActive,
        isHolidayDesign: normalizedInput.isHolidayDesign,
        dutyBlocks: normalizedInput.dutyBlocks,
        updatedAt: new Date().toISOString()
        }
      );

      const changedFields: string[] = [];
      if (existingDutyDesign.code !== updatedDutyDesign.code) {
        changedFields.push("code");
      }
      if (existingDutyDesign.label !== updatedDutyDesign.label) {
        changedFields.push("label");
      }
      if (
        (existingDutyDesign.description ?? "") !==
        (updatedDutyDesign.description ?? "")
      ) {
        changedFields.push("description");
      }
      if (
        existingDutyDesign.isHolidayDesign !== updatedDutyDesign.isHolidayDesign
      ) {
        changedFields.push("isHolidayDesign");
      }
      if (
        JSON.stringify(existingDutyDesign.dutyBlocks) !==
        JSON.stringify(updatedDutyDesign.dutyBlocks)
      ) {
        changedFields.push("dutyBlocks");
      }

      if (changedFields.length > 0) {
        await logDutyDesignUpdated(dependencies.auditLogService, {
          dutyDesign: updatedDutyDesign,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            changedFields,
            before: {
              code: existingDutyDesign.code,
              label: existingDutyDesign.label,
              description: existingDutyDesign.description ?? null,
              isHolidayDesign: existingDutyDesign.isHolidayDesign,
              dutyBlocks: existingDutyDesign.dutyBlocks
            },
            after: {
              code: updatedDutyDesign.code,
              label: updatedDutyDesign.label,
              description: updatedDutyDesign.description ?? null,
              isHolidayDesign: updatedDutyDesign.isHolidayDesign,
              dutyBlocks: updatedDutyDesign.dutyBlocks
            }
          }
        });
      }

      if (existingDutyDesign.isActive !== updatedDutyDesign.isActive) {
        await (
          updatedDutyDesign.isActive
            ? logDutyDesignActivated
            : logDutyDesignDeactivated
        )(dependencies.auditLogService, {
          dutyDesign: updatedDutyDesign,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            previousStatus: existingDutyDesign.isActive ? "ACTIVE" : "INACTIVE",
            nextStatus: updatedDutyDesign.isActive ? "ACTIVE" : "INACTIVE"
          }
        });
      }

      return updatedDutyDesign;
    },
    async deleteDutyDesign(input) {
      assertAdminActorRole(input.actorRole, "Only admins can manage duty designs.");
      const dutyDesign = await loadDutyDesignOrThrow(
        dependencies.dutyDesignRepository,
        input.id
      );

      try {
        await assertDutyDesignCanBeDeleted(dependencies, dutyDesign);
      } catch (error) {
        await logDutyDesignDeleteBlocked(dependencies.auditLogService, {
          dutyDesign,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            message:
              error instanceof Error
                ? error.message
                : "Duty design delete blocked."
          }
        });
        throw error;
      }

      await dependencies.dutyDesignRepository.delete(dutyDesign.id);

      await logDutyDesignDeleted(dependencies.auditLogService, {
        dutyDesign,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: dutyDesign.code,
          label: dutyDesign.label
        }
      });
    }
  };
}
