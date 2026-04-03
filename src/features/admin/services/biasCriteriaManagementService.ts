import type {
  ActorRole,
  BiasCriteria,
  Doctor,
  DayOfWeek,
  EntityId,
  YearMonthString
} from "@/domain/models";
import type {
  BiasCriteriaRepository,
  BiasLedgerRepository,
  DoctorRepository,
  RosterSnapshotRepository
} from "@/domain/repositories";
import {
  CriteriaLockedError,
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

export interface ToggleBiasCriteriaLockInput extends BiasCriteriaActorInput {
  readonly id: EntityId;
  readonly isLocked: boolean;
}

export interface DoctorBiasSummary {
  readonly doctorId: EntityId;
  readonly doctorName: string;
  readonly doctorUniqueId: string;
  readonly biasValue: number;
  readonly isActive: boolean;
}

export interface BiasCriteriaManagementService {
  getCriteriaList(): Promise<ReadonlyArray<BiasCriteria>>;
  getCriteriaLabel(id: EntityId): Promise<string | null>;
  getDoctorsByBiasForCriteria(input: {
    readonly criteriaId: EntityId;
    readonly currentMonth: YearMonthString;
  }): Promise<ReadonlyArray<DoctorBiasSummary>>;
  createCriteria(input: CreateBiasCriteriaInput): Promise<BiasCriteria>;
  updateCriteria(input: UpdateBiasCriteriaInput): Promise<BiasCriteria>;
  toggleCriteriaActive(input: ToggleBiasCriteriaActiveInput): Promise<BiasCriteria>;
  toggleCriteriaLock(input: ToggleBiasCriteriaLockInput): Promise<BiasCriteria>;
  deleteCriteria(input: BiasCriteriaActorInput & { readonly id: EntityId }): Promise<void>;
}

export interface BiasCriteriaManagementServiceDependencies {
  readonly biasCriteriaRepository: BiasCriteriaRepository;
  readonly biasLedgerRepository: BiasLedgerRepository;
  readonly doctorRepository: DoctorRepository;
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
      | "BIAS_CRITERIA_LOCKED"
      | "BIAS_CRITERIA_UNLOCKED"
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

function assertCriteriaUnlocked(
  criteria: BiasCriteria,
  actionLabel: "edit" | "change status" | "delete"
): void {
  if (!criteria.isLocked) {
    return;
  }

  throw new CriteriaLockedError(
    `Bias criteria '${criteria.label}' is locked. Unlock it before you ${actionLabel} it.`
  );
}

function buildDoctorBiasSummary(
  doctor: Doctor,
  biasValue: number
): DoctorBiasSummary {
  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorUniqueId: doctor.uniqueIdentifier,
    biasValue,
    isActive: doctor.isActive
  };
}

function sortDoctorBiasSummaries(
  summaries: ReadonlyArray<DoctorBiasSummary>
): ReadonlyArray<DoctorBiasSummary> {
  return [...summaries].sort((left, right) => {
    if (left.biasValue !== right.biasValue) {
      return left.biasValue - right.biasValue;
    }

    const nameComparison = left.doctorName.localeCompare(right.doctorName);
    if (nameComparison !== 0) {
      return nameComparison;
    }

    return left.doctorId.localeCompare(right.doctorId);
  });
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
    async getDoctorsByBiasForCriteria(input) {
      await loadCriteriaOrThrow(
        dependencies.biasCriteriaRepository,
        input.criteriaId
      );

      const [doctors, biasLedgers] = await Promise.all([
        dependencies.doctorRepository.list(),
        dependencies.biasLedgerRepository.listByMonth(input.currentMonth)
      ]);

      const biasLedgerByDoctorId = new Map(
        biasLedgers.map((ledger) => [ledger.doctorId, ledger])
      );

      return sortDoctorBiasSummaries(
        doctors.map((doctor) =>
          buildDoctorBiasSummary(
            doctor,
            biasLedgerByDoctorId.get(doctor.id)?.balances[input.criteriaId] ?? 0
          )
        )
      );
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
        isLocked: false,
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
      assertCriteriaUnlocked(criteria, "edit");
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
      assertCriteriaUnlocked(criteria, "change status");

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
    async toggleCriteriaLock(input) {
      const criteria = await loadCriteriaOrThrow(
        dependencies.biasCriteriaRepository,
        input.id
      );

      if (criteria.isLocked === input.isLocked) {
        return criteria;
      }

      const updatedCriteria = await dependencies.biasCriteriaRepository.update(criteria.id, {
        isLocked: input.isLocked,
        lockedAt: input.isLocked ? new Date().toISOString() : undefined,
        lockedByActorId: input.isLocked ? input.actorId : undefined,
        updatedAt: new Date().toISOString(),
        updatedByActorId: input.actorId
      });

      await appendCriteriaAuditLog(dependencies, {
        actionType: updatedCriteria.isLocked
          ? "BIAS_CRITERIA_LOCKED"
          : "BIAS_CRITERIA_UNLOCKED",
        criteria: updatedCriteria,
        actorId: input.actorId,
        actorRole: input.actorRole,
        details: {
          previousLockStatus: criteria.isLocked ? "LOCKED" : "UNLOCKED",
          nextLockStatus: updatedCriteria.isLocked ? "LOCKED" : "UNLOCKED",
          lockedAt: updatedCriteria.lockedAt ?? null,
          lockedByActorId: updatedCriteria.lockedByActorId ?? null
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
        assertCriteriaUnlocked(criteria, "delete");
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
