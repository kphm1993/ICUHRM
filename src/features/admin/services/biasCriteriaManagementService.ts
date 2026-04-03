import type {
  ActorRole,
  BiasCriteria,
  DayOfWeek,
  EntityId
} from "@/domain/models";
import type {
  BiasCriteriaRepository,
  BiasLedgerRepository,
  RosterSnapshotRepository
} from "@/domain/repositories";
import {
  CriteriaInUseError,
  RepositoryNotFoundError
} from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { validateBiasCriteriaInput } from "@/features/admin/services/biasCriteriaManagementValidation";

export interface BiasCriteriaActorInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
}

export interface CreateBiasCriteriaInput extends BiasCriteriaActorInput {
  readonly code: string;
  readonly label: string;
  readonly locationIds: ReadonlyArray<EntityId>;
  readonly shiftTypeIds: ReadonlyArray<EntityId>;
  readonly weekdayConditions: ReadonlyArray<DayOfWeek>;
  readonly isWeekendOnly: boolean;
}

export interface UpdateBiasCriteriaInput extends CreateBiasCriteriaInput {
  readonly id: EntityId;
  readonly isActive: boolean;
}

export interface ToggleBiasCriteriaActiveInput extends BiasCriteriaActorInput {
  readonly id: EntityId;
  readonly isActive: boolean;
}

export interface BiasCriteriaManagementService {
  getCriteriaList(): Promise<ReadonlyArray<BiasCriteria>>;
  getCriteriaLabel(id: EntityId): Promise<string | null>;
  createCriteria(input: CreateBiasCriteriaInput): Promise<BiasCriteria>;
  updateCriteria(input: UpdateBiasCriteriaInput): Promise<BiasCriteria>;
  toggleCriteriaActive(input: ToggleBiasCriteriaActiveInput): Promise<BiasCriteria>;
  deleteCriteria(input: BiasCriteriaActorInput & { readonly id: EntityId }): Promise<void>;
}

export interface BiasCriteriaManagementServiceDependencies {
  readonly biasCriteriaRepository: BiasCriteriaRepository;
  readonly biasLedgerRepository: BiasLedgerRepository;
  readonly rosterSnapshotRepository: RosterSnapshotRepository;
  readonly auditLogService: AuditLogService;
}

async function appendCriteriaAuditLog(
  dependencies: BiasCriteriaManagementServiceDependencies,
  input: {
    readonly actionType:
      | "BIAS_CRITERIA_CREATED"
      | "BIAS_CRITERIA_UPDATED"
      | "BIAS_CRITERIA_ACTIVATED"
      | "BIAS_CRITERIA_DEACTIVATED"
      | "BIAS_CRITERIA_DELETED"
      | "BIAS_CRITERIA_DELETE_BLOCKED";
    readonly criteria: BiasCriteria;
    readonly actorId: EntityId;
    readonly actorRole: ActorRole;
    readonly details: Readonly<Record<string, unknown>>;
  }
) {
  await dependencies.auditLogService.appendLog({
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    entityType: "BIAS_CRITERIA",
    entityId: input.criteria.id,
    details: input.details
  });
}

async function loadCriteriaOrThrow(
  criteriaRepository: BiasCriteriaRepository,
  criteriaId: EntityId
): Promise<BiasCriteria> {
  const criteria = await criteriaRepository.getById(criteriaId);

  if (!criteria) {
    throw new RepositoryNotFoundError(`Bias criteria '${criteriaId}' was not found.`);
  }

  return criteria;
}

async function assertCriteriaCodeAvailable(
  criteriaRepository: BiasCriteriaRepository,
  code: string,
  currentCriteriaId?: EntityId
): Promise<void> {
  const criteriaEntries = await criteriaRepository.listAll();
  const conflict = criteriaEntries.find(
    (criteria) =>
      criteria.code.toUpperCase() === code.toUpperCase() &&
      criteria.id !== currentCriteriaId
  );

  if (conflict) {
    throw new Error(`Bias criteria code '${code}' is already in use.`);
  }
}

async function assertCriteriaCanBeDeleted(
  dependencies: BiasCriteriaManagementServiceDependencies,
  criteria: BiasCriteria
): Promise<void> {
  const [hasCurrentUsage, snapshots] = await Promise.all([
    dependencies.biasLedgerRepository.hasAnyBalanceForCriteria(criteria.id),
    dependencies.rosterSnapshotRepository.list()
  ]);

  const hasHistoricalUsage = snapshots.some((snapshot) =>
    snapshot.updatedBias.some((entry) =>
      Object.prototype.hasOwnProperty.call(entry.balances, criteria.id)
    )
  );

  if (hasCurrentUsage || hasHistoricalUsage) {
    const blockers: string[] = [];
    if (hasCurrentUsage) {
      blockers.push("it is present in current bias ledgers");
    }
    if (hasHistoricalUsage) {
      blockers.push("it is referenced by historical roster snapshots");
    }

    throw new CriteriaInUseError(
      `Cannot delete criteria '${criteria.label}' because ${blockers.join(" and ")}.`
    );
  }
}

export function createBiasCriteriaManagementService(
  dependencies: BiasCriteriaManagementServiceDependencies
): BiasCriteriaManagementService {
  return {
    async getCriteriaList() {
      return dependencies.biasCriteriaRepository.listAll();
    },
    async getCriteriaLabel(id) {
      const criteria = await dependencies.biasCriteriaRepository.getById(id);
      return criteria?.label ?? null;
    },
    async createCriteria(input) {
      const normalizedInput = validateBiasCriteriaInput(input);
      await assertCriteriaCodeAvailable(
        dependencies.biasCriteriaRepository,
        normalizedInput.code
      );
      const timestamp = new Date().toISOString();

      const criteria = await dependencies.biasCriteriaRepository.create({
        id: crypto.randomUUID(),
        code: normalizedInput.code,
        label: normalizedInput.label,
        locationIds: normalizedInput.locationIds,
        shiftTypeIds: normalizedInput.shiftTypeIds,
        weekdayConditions: normalizedInput.weekdayConditions,
        isWeekendOnly: normalizedInput.isWeekendOnly,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdByActorId: input.actorId,
        updatedByActorId: input.actorId
      });

      await appendCriteriaAuditLog(dependencies, {
        actionType: "BIAS_CRITERIA_CREATED",
        criteria,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: criteria.code,
          label: criteria.label,
          locationIds: criteria.locationIds,
          shiftTypeIds: criteria.shiftTypeIds,
          weekdayConditions: criteria.weekdayConditions,
          isWeekendOnly: criteria.isWeekendOnly,
          isActive: criteria.isActive
        }
      });

      return criteria;
    },
    async updateCriteria(input) {
      const criteria = await loadCriteriaOrThrow(
        dependencies.biasCriteriaRepository,
        input.id
      );
      const normalizedInput = validateBiasCriteriaInput(input);
      await assertCriteriaCodeAvailable(
        dependencies.biasCriteriaRepository,
        normalizedInput.code,
        criteria.id
      );

      const updatedCriteria = await dependencies.biasCriteriaRepository.update(criteria.id, {
        code: normalizedInput.code,
        label: normalizedInput.label,
        locationIds: normalizedInput.locationIds,
        shiftTypeIds: normalizedInput.shiftTypeIds,
        weekdayConditions: normalizedInput.weekdayConditions,
        isWeekendOnly: normalizedInput.isWeekendOnly,
        isActive: input.isActive,
        updatedAt: new Date().toISOString(),
        updatedByActorId: input.actorId
      });

      const changedFields: string[] = [];
      if (criteria.code !== updatedCriteria.code) {
        changedFields.push("code");
      }
      if (criteria.label !== updatedCriteria.label) {
        changedFields.push("label");
      }
      if (
        JSON.stringify(criteria.locationIds) !==
        JSON.stringify(updatedCriteria.locationIds)
      ) {
        changedFields.push("locationIds");
      }
      if (
        JSON.stringify(criteria.shiftTypeIds) !==
        JSON.stringify(updatedCriteria.shiftTypeIds)
      ) {
        changedFields.push("shiftTypeIds");
      }
      if (
        JSON.stringify(criteria.weekdayConditions) !==
        JSON.stringify(updatedCriteria.weekdayConditions)
      ) {
        changedFields.push("weekdayConditions");
      }
      if (criteria.isWeekendOnly !== updatedCriteria.isWeekendOnly) {
        changedFields.push("isWeekendOnly");
      }

      if (changedFields.length > 0) {
        await appendCriteriaAuditLog(dependencies, {
          actionType: "BIAS_CRITERIA_UPDATED",
          criteria: updatedCriteria,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            changedFields,
            before: {
              code: criteria.code,
              label: criteria.label,
              locationIds: criteria.locationIds,
              shiftTypeIds: criteria.shiftTypeIds,
              weekdayConditions: criteria.weekdayConditions,
              isWeekendOnly: criteria.isWeekendOnly
            },
            after: {
              code: updatedCriteria.code,
              label: updatedCriteria.label,
              locationIds: updatedCriteria.locationIds,
              shiftTypeIds: updatedCriteria.shiftTypeIds,
              weekdayConditions: updatedCriteria.weekdayConditions,
              isWeekendOnly: updatedCriteria.isWeekendOnly
            }
          }
        });
      }

      if (criteria.isActive !== updatedCriteria.isActive) {
        await appendCriteriaAuditLog(dependencies, {
          actionType: updatedCriteria.isActive
            ? "BIAS_CRITERIA_ACTIVATED"
            : "BIAS_CRITERIA_DEACTIVATED",
          criteria: updatedCriteria,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            previousStatus: criteria.isActive ? "ACTIVE" : "INACTIVE",
            nextStatus: updatedCriteria.isActive ? "ACTIVE" : "INACTIVE"
          }
        });
      }

      return updatedCriteria;
    },
    async toggleCriteriaActive(input) {
      const criteria = await loadCriteriaOrThrow(
        dependencies.biasCriteriaRepository,
        input.id
      );

      if (criteria.isActive === input.isActive) {
        return criteria;
      }

      const updatedCriteria = await dependencies.biasCriteriaRepository.update(criteria.id, {
        isActive: input.isActive,
        updatedAt: new Date().toISOString(),
        updatedByActorId: input.actorId
      });

      await appendCriteriaAuditLog(dependencies, {
        actionType: updatedCriteria.isActive
          ? "BIAS_CRITERIA_ACTIVATED"
          : "BIAS_CRITERIA_DEACTIVATED",
        criteria: updatedCriteria,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          previousStatus: criteria.isActive ? "ACTIVE" : "INACTIVE",
          nextStatus: updatedCriteria.isActive ? "ACTIVE" : "INACTIVE"
        }
      });

      return updatedCriteria;
    },
    async deleteCriteria(input) {
      const criteria = await loadCriteriaOrThrow(
        dependencies.biasCriteriaRepository,
        input.id
      );

      try {
        await assertCriteriaCanBeDeleted(dependencies, criteria);
      } catch (error) {
        await appendCriteriaAuditLog(dependencies, {
          actionType: "BIAS_CRITERIA_DELETE_BLOCKED",
          criteria,
          actorId: input.actorId,
          actorRole: input.actorRole,
          details: {
            message: error instanceof Error ? error.message : "Criteria delete blocked."
          }
        });
        throw error;
      }

      await dependencies.biasCriteriaRepository.delete(criteria.id);
      await appendCriteriaAuditLog(dependencies, {
        actionType: "BIAS_CRITERIA_DELETED",
        criteria,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          code: criteria.code,
          label: criteria.label
        }
      });
    }
  };
}
