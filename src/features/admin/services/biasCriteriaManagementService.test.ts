import { describe, expect, it, vi } from "vitest";
import type { AuditLog, BiasCriteria, BiasLedger, RosterSnapshot } from "@/domain/models";
import type { RosterSnapshotRepository } from "@/domain/repositories";
import { CriteriaInUseError } from "@/domain/repositories";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository
} from "@/infrastructure/repositories/inMemory";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { createBiasCriteriaManagementService } from "@/features/admin/services/biasCriteriaManagementService";
import { BiasCriteriaValidationError } from "@/features/admin/services/biasCriteriaManagementValidation";

const NOW = "2026-04-03T08:00:00.000Z";

function createAuditLogServiceMock(): AuditLogService {
  return {
    appendLog: vi.fn(async (entry) => {
      const auditLog: AuditLog = {
        id: crypto.randomUUID(),
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        actionType: entry.actionType,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
        createdAt: NOW,
        correlationId: entry.correlationId
      };

      return auditLog;
    }),
    listLogs: vi.fn(async () => [])
  };
}

function createRosterSnapshotRepositoryMock(
  snapshots: ReadonlyArray<RosterSnapshot>
): RosterSnapshotRepository {
  return {
    list: vi.fn(async () => snapshots),
    findById: vi.fn(async (id) => snapshots.find((snapshot) => snapshot.roster.id === id) ?? null),
    save: vi.fn(async (snapshot) => snapshot)
  };
}

function createCriteria(overrides: Partial<BiasCriteria> = {}): BiasCriteria {
  return {
    id: overrides.id ?? "criteria-weekend-night",
    code: overrides.code ?? "WEEKEND_NIGHT",
    label: overrides.label ?? "Weekend Night Coverage",
    locationIds: overrides.locationIds ?? [],
    shiftTypeIds: overrides.shiftTypeIds ?? [],
    weekdayConditions: overrides.weekdayConditions ?? ["SAT", "SUN"],
    isWeekendOnly: overrides.isWeekendOnly ?? true,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    createdByActorId: overrides.createdByActorId ?? "user-admin-demo",
    updatedByActorId: overrides.updatedByActorId ?? "user-admin-demo"
  };
}

function createBiasLedger(criteriaId: string): BiasLedger {
  return {
    id: "bias-ledger-1",
    doctorId: "doctor-demo",
    effectiveMonth: "2026-04",
    balances: {
      [criteriaId]: 0
    },
    source: "ROSTER_GENERATION",
    sourceReferenceId: "roster-april",
    updatedAt: NOW,
    updatedByActorId: "system"
  };
}

function createSnapshotReferencingCriteria(criteriaId: string): RosterSnapshot {
  return {
    roster: {
      id: "roster-snapshot-1",
      period: {
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      },
      status: "LOCKED",
      isDeleted: false,
      createdAt: NOW,
      createdByUserId: "user-admin-demo",
      generatedAt: NOW,
      publishedAt: NOW,
      lockedAt: NOW,
      weekendGroupSchedule: []
    },
    doctorReferences: [],
    shifts: [],
    assignments: [],
    warnings: [],
    validation: {
      isValid: true,
      issues: []
    },
    updatedBias: [
      {
        id: "bias-history-1",
        doctorId: "doctor-demo",
        effectiveMonth: "2026-04",
        balances: {
          [criteriaId]: 0
        },
        source: "ROSTER_GENERATION",
        sourceReferenceId: "roster-snapshot-1",
        updatedAt: NOW,
        updatedByActorId: "system"
      }
    ],
    generatedInputSummary: {
      rosterMonth: "2026-04",
      range: {
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      },
      activeDoctorCount: 0,
      leaveCount: 0,
      offRequestCount: 0,
      shiftTypeCount: 2,
      firstWeekendOffGroup: "A",
      weekendGroupSchedule: [],
      activeBiasCriteria: [],
      activeDutyLocations: []
    }
  };
}

describe("biasCriteriaManagementService", () => {
  it("normalizes code and label when creating criteria", async () => {
    const auditLogService = createAuditLogServiceMock();
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService
    });

    const createdCriteria = await service.createCriteria({
      code: " weekend_night_bias ",
      label: " Weekend Night Bias ",
      locationIds: [],
      shiftTypeIds: [],
      weekdayConditions: ["SAT", "SUN"],
      isWeekendOnly: true,
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    expect(createdCriteria.code).toBe("WEEKEND_NIGHT_BIAS");
    expect(createdCriteria.label).toBe("Weekend Night Bias");
    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "BIAS_CRITERIA_CREATED",
        entityType: "BIAS_CRITERIA",
        details: expect.objectContaining({
          code: "WEEKEND_NIGHT_BIAS",
          label: "Weekend Night Bias",
          isWeekendOnly: true,
          isActive: true
        })
      })
    );
  });

  it("enforces weekend-only validation against selected weekdays", async () => {
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService: createAuditLogServiceMock()
    });

    await expect(
      service.createCriteria({
        code: "WEEKEND_ONLY",
        label: "Weekend Only",
        locationIds: [],
        shiftTypeIds: [],
        weekdayConditions: ["MON", "TUE"],
        isWeekendOnly: true,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(BiasCriteriaValidationError);
  });

  it("blocks delete when the criteria is still present in current bias ledgers", async () => {
    const criteria = createCriteria();
    const auditLogService = createAuditLogServiceMock();
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository([criteria]),
      biasLedgerRepository: new InMemoryBiasLedgerRepository([
        createBiasLedger(criteria.id)
      ]),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService
    });

    await expect(
      service.deleteCriteria({
        id: criteria.id,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(CriteriaInUseError);

    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "BIAS_CRITERIA_DELETE_BLOCKED",
        entityType: "BIAS_CRITERIA",
        entityId: criteria.id,
        details: expect.objectContaining({
          message: expect.stringContaining("current bias ledgers")
        })
      })
    );
  });

  it("blocks delete when historical roster snapshots still reference the criteria", async () => {
    const criteria = createCriteria({
      id: "criteria-historical"
    });
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository([criteria]),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([
        createSnapshotReferencingCriteria(criteria.id)
      ]),
      auditLogService: createAuditLogServiceMock()
    });

    await expect(
      service.deleteCriteria({
        id: criteria.id,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(CriteriaInUseError);
  });
});
