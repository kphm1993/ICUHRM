import { describe, expect, it, vi } from "vitest";
import type {
  AuditLog,
  BiasCriteria,
  BiasLedger,
  Doctor,
  RosterSnapshot
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID as DEFAULT_FALLBACK_LOCATION_ID } from "@/domain/models";
import type { RosterSnapshotRepository } from "@/domain/repositories";
import { CriteriaInUseError, CriteriaLockedError } from "@/domain/repositories";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryBiasLedgerRepository,
  InMemoryDoctorRepository
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
    isLocked: overrides.isLocked ?? false,
    lockedAt: overrides.lockedAt,
    lockedByActorId: overrides.lockedByActorId,
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
      activeDutyLocations: [],
      doctorGroupSnapshot: {},
      allowedDoctorGroupIdByDate: {},
      dutyDesignAssignments: {},
      dutyDesignSnapshot: {},
      publicHolidayDates: [],
      fallbackLocationId: DEFAULT_FALLBACK_LOCATION_ID
    }
  };
}

function createDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: overrides.id ?? "doctor-1",
    userId: overrides.userId ?? `user-${overrides.id ?? "doctor-1"}`,
    name: overrides.name ?? "Dr. A Test",
    phoneNumber: overrides.phoneNumber ?? "0710000001",
    uniqueIdentifier: overrides.uniqueIdentifier ?? `doctor.${overrides.id ?? "one"}`,
    weekendGroup: overrides.weekendGroup ?? "A",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("biasCriteriaManagementService", () => {
  it("normalizes code and label when creating criteria", async () => {
    const auditLogService = createAuditLogServiceMock();
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      doctorRepository: new InMemoryDoctorRepository(),
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
      doctorRepository: new InMemoryDoctorRepository(),
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
      doctorRepository: new InMemoryDoctorRepository(),
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
      doctorRepository: new InMemoryDoctorRepository(),
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

  it("locks and unlocks criteria with audit logging", async () => {
    const criteria = createCriteria();
    const auditLogService = createAuditLogServiceMock();
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository([criteria]),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      doctorRepository: new InMemoryDoctorRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService
    });

    const lockedCriteria = await service.toggleCriteriaLock({
      id: criteria.id,
      isLocked: true,
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    expect(lockedCriteria.isLocked).toBe(true);
    expect(lockedCriteria.lockedAt).toBeTruthy();
    expect(lockedCriteria.lockedByActorId).toBe("user-admin-demo");

    const unlockedCriteria = await service.toggleCriteriaLock({
      id: criteria.id,
      isLocked: false,
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    expect(unlockedCriteria.isLocked).toBe(false);
    expect(unlockedCriteria.lockedAt).toBeUndefined();
    expect(unlockedCriteria.lockedByActorId).toBeUndefined();
    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "BIAS_CRITERIA_LOCKED",
        entityType: "BIAS_CRITERIA",
        entityId: criteria.id
      })
    );
    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "BIAS_CRITERIA_UNLOCKED",
        entityType: "BIAS_CRITERIA",
        entityId: criteria.id
      })
    );
  });

  it("blocks editing and status changes for locked criteria", async () => {
    const criteria = createCriteria({
      isLocked: true,
      lockedAt: NOW,
      lockedByActorId: "user-admin-demo"
    });
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository([criteria]),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      doctorRepository: new InMemoryDoctorRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService: createAuditLogServiceMock()
    });

    await expect(
      service.updateCriteria({
        id: criteria.id,
        code: criteria.code,
        label: "Updated Label",
        locationIds: criteria.locationIds,
        shiftTypeIds: criteria.shiftTypeIds,
        weekdayConditions: criteria.weekdayConditions,
        isWeekendOnly: criteria.isWeekendOnly,
        isActive: criteria.isActive,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(CriteriaLockedError);

    await expect(
      service.toggleCriteriaActive({
        id: criteria.id,
        isActive: false,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(CriteriaLockedError);
  });

  it("returns all doctors for a criteria sorted from most negative bias to most positive bias", async () => {
    const criteria = createCriteria({
      id: "criteria-all-shifts",
      code: "ALL_SHIFTS",
      label: "All Shifts",
      isWeekendOnly: false,
      weekdayConditions: []
    });
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository([criteria]),
      biasLedgerRepository: new InMemoryBiasLedgerRepository([
        {
          id: "bias-1",
          doctorId: "doctor-negative",
          effectiveMonth: "2026-04",
          balances: {
            [criteria.id]: -2
          },
          source: "ROSTER_GENERATION",
          sourceReferenceId: "roster-1",
          updatedAt: NOW,
          updatedByActorId: "system"
        },
        {
          id: "bias-2",
          doctorId: "doctor-positive",
          effectiveMonth: "2026-04",
          balances: {
            [criteria.id]: 3
          },
          source: "ROSTER_GENERATION",
          sourceReferenceId: "roster-1",
          updatedAt: NOW,
          updatedByActorId: "system"
        }
      ]),
      doctorRepository: new InMemoryDoctorRepository([
        createDoctor({
          id: "doctor-zero",
          name: "Dr. Beta",
          uniqueIdentifier: "doctor.beta"
        }),
        createDoctor({
          id: "doctor-negative",
          name: "Dr. Alpha",
          uniqueIdentifier: "doctor.alpha"
        }),
        createDoctor({
          id: "doctor-positive",
          name: "Dr. Gamma",
          uniqueIdentifier: "doctor.gamma",
          isActive: false
        })
      ]),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService: createAuditLogServiceMock()
    });

    await expect(
      service.getDoctorsByBiasForCriteria({
        criteriaId: criteria.id,
        currentMonth: "2026-04"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        doctorId: "doctor-negative",
        biasValue: -2,
        isActive: true
      }),
      expect.objectContaining({
        doctorId: "doctor-zero",
        biasValue: 0,
        isActive: true
      }),
      expect.objectContaining({
        doctorId: "doctor-positive",
        biasValue: 3,
        isActive: false
      })
    ]);
  });

  it("uses doctor name and id as deterministic tie-breakers for equal bias values", async () => {
    const criteria = createCriteria({
      id: "criteria-ties",
      code: "TIES",
      label: "Tie Criteria",
      isWeekendOnly: false,
      weekdayConditions: []
    });
    const service = createBiasCriteriaManagementService({
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository([criteria]),
      biasLedgerRepository: new InMemoryBiasLedgerRepository(),
      doctorRepository: new InMemoryDoctorRepository([
        createDoctor({
          id: "doctor-b",
          name: "Dr. Alpha",
          uniqueIdentifier: "doctor.alpha.b"
        }),
        createDoctor({
          id: "doctor-a",
          name: "Dr. Alpha",
          uniqueIdentifier: "doctor.alpha.a"
        }),
        createDoctor({
          id: "doctor-c",
          name: "Dr. Beta",
          uniqueIdentifier: "doctor.beta"
        })
      ]),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService: createAuditLogServiceMock()
    });

    const summaries = await service.getDoctorsByBiasForCriteria({
      criteriaId: criteria.id,
      currentMonth: "2026-04"
    });

    expect(summaries.map((summary) => summary.doctorId)).toEqual([
      "doctor-a",
      "doctor-b",
      "doctor-c"
    ]);
    expect(summaries.every((summary) => summary.biasValue === 0)).toBe(true);
  });
});
