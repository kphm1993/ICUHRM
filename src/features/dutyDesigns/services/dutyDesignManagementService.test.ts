import { describe, expect, it } from "vitest";
import type {
  AuditLog,
  DutyDesign,
  DutyDesignAssignment,
  DutyLocation,
  RosterSnapshot,
  ShiftType
} from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { EntityInUseError, UnauthorizedError } from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  InMemoryDutyDesignAssignmentRepository,
  InMemoryDutyDesignRepository,
  InMemoryDutyLocationRepository,
  InMemoryShiftTypeRepository
} from "@/infrastructure/repositories/inMemory";
import { createDutyDesignManagementService } from "@/features/dutyDesigns/services/dutyDesignManagementService";
import { DutyDesignValidationError } from "@/features/dutyDesigns/services/dutyDesignManagementValidation";

const NOW = "2026-04-03T08:00:00.000Z";
const ACTOR_ID = "user-admin-demo";
const ACTOR_ROLE = "ADMIN" as const;

function createRecordingAuditLogService(): AuditLogService & {
  readonly entries: AuditLog[];
} {
  const entries: AuditLog[] = [];

  return {
    entries,
    appendLog: async (entry) => {
      const auditLog = {
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
      entries.push(auditLog);
      return auditLog;
    },
    listLogs: async () => entries
  };
}

function createEmptyRosterSnapshotRepository() {
  return {
    list: async () => [],
    findById: async () => null,
    save: async (snapshot: RosterSnapshot) => snapshot
  };
}

function createRosterSnapshotReferencingDutyDesign(
  dutyDesign: DutyDesign
): RosterSnapshot {
  return {
    roster: {
      id: "roster-1",
      period: {
        startDate: "2026-05-01",
        endDate: "2026-05-31"
      },
      status: "PUBLISHED",
      isDeleted: false,
      createdAt: NOW,
      createdByUserId: ACTOR_ID,
      generatedAt: NOW,
      publishedAt: NOW,
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
    updatedBias: [],
    generatedInputSummary: {
      rosterMonth: "2026-05",
      range: {
        startDate: "2026-05-01",
        endDate: "2026-05-31"
      },
      activeDoctorCount: 0,
      leaveCount: 0,
      offRequestCount: 0,
      shiftTypeCount: 0,
      firstWeekendOffGroup: "A",
      weekendGroupSchedule: [],
      activeBiasCriteria: [],
      activeDutyLocations: [
        {
          id: DEFAULT_DUTY_LOCATION_ID,
          code: "CCU",
          label: "Cardiac Care Unit",
          description: "Default duty location",
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW
        }
      ],
      doctorGroupSnapshot: {},
      allowedDoctorGroupIdByDate: {},
      dutyDesignAssignments: {
        "2026-05-10": {
          standardDesignId: dutyDesign.id
        }
      },
      dutyDesignSnapshot: {
        [dutyDesign.id]: dutyDesign
      },
      publicHolidayDates: [],
      fallbackLocationId: DEFAULT_DUTY_LOCATION_ID
    }
  };
}

function createRosterSnapshotRepositoryWithSeed(
  snapshots: ReadonlyArray<RosterSnapshot>
) {
  return {
    list: async () => snapshots,
    findById: async (id: string) =>
      snapshots.find((snapshot) => snapshot.roster.id === id) ?? null,
    save: async (snapshot: RosterSnapshot) => snapshot
  };
}

function createShiftType(overrides: Partial<ShiftType> = {}): ShiftType {
  return {
    id: overrides.id ?? "shift-type-day",
    code: overrides.code ?? "DAY",
    label: overrides.label ?? "Day",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "20:00",
    category: overrides.category ?? "DAY",
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? "location-ccu",
    code: overrides.code ?? "CCU",
    label: overrides.label ?? "Cardiac Care Unit",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-a",
    code: overrides.code ?? "DESIGN_A",
    label: overrides.label ?? "Design A",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        locationId: "location-ccu",
        doctorCount: 1
      }
    ],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createAssignment(
  overrides: Partial<DutyDesignAssignment> = {}
): DutyDesignAssignment {
  return {
    id: overrides.id ?? "assignment-1",
    date: overrides.date ?? "2026-04-10",
    dutyDesignId: overrides.dutyDesignId ?? "design-a",
    isHolidayOverride: overrides.isHolidayOverride ?? false,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("dutyDesignManagementService", () => {
  it("creates duty designs with validated active shift types and locations", async () => {
    const auditLogService = createRecordingAuditLogService();
    const service = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        createShiftType()
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        createLocation()
      ]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService
    });

    const dutyDesign = await service.createDutyDesign({
      code: " weekday_primary ",
      label: " Weekday Primary ",
      description: " Main weekday design ",
      isActive: true,
      isHolidayDesign: false,
      dutyBlocks: [
        {
          shiftTypeId: "shift-type-day",
          locationId: "location-ccu",
          doctorCount: 2,
          offOffsetDays: 1
        }
      ],
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(dutyDesign.code).toBe("WEEKDAY_PRIMARY");
    expect(dutyDesign.label).toBe("Weekday Primary");
    expect(dutyDesign.dutyBlocks[0]?.doctorCount).toBe(2);
    expect(await auditLogService.listLogs()).toEqual([
      expect.objectContaining({
        actionType: "DUTY_DESIGN_CREATED",
        entityType: "DUTY_DESIGN",
        entityId: dutyDesign.id
      })
    ]);
  });

  it("rejects duty blocks that reference inactive shift types or locations", async () => {
    const service = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        createShiftType({
          isActive: false
        })
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        createLocation({
          isActive: false
        })
      ]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.createDutyDesign({
        code: "WEEKDAY_PRIMARY",
        label: "Weekday Primary",
        isActive: true,
        isHolidayDesign: false,
        dutyBlocks: [
          {
            shiftTypeId: "shift-type-day",
            locationId: "location-ccu",
            doctorCount: 1
          }
        ],
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toMatchObject({
      fieldErrors: expect.objectContaining({
        dutyBlocks: expect.stringContaining("inactive shift type")
      })
    } satisfies Partial<DutyDesignValidationError>);
  });

  it("blocks cyclic follow-up chains", async () => {
    const designA = createDutyDesign({
      id: "design-a",
      code: "DESIGN_A",
      label: "Design A",
      dutyBlocks: [
        {
          shiftTypeId: "shift-type-day",
          doctorCount: 1,
          followUpDutyDesignId: "design-b"
        }
      ]
    });
    const designB = createDutyDesign({
      id: "design-b",
      code: "DESIGN_B",
      label: "Design B"
    });
    const service = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository([designA, designB]),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        createShiftType()
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        createLocation()
      ]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.updateDutyDesign({
        id: "design-b",
        code: "DESIGN_B",
        label: "Design B",
        description: undefined,
        isActive: true,
        isHolidayDesign: false,
        dutyBlocks: [
          {
            shiftTypeId: "shift-type-day",
            doctorCount: 1,
            followUpDutyDesignId: "design-a"
          }
        ],
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toMatchObject({
      fieldErrors: expect.objectContaining({
        dutyBlocks: expect.stringContaining("cannot contain cycles")
      })
    } satisfies Partial<DutyDesignValidationError>);
  });

  it("blocks delete when assignments, follow-up references, or historical snapshots still use the design", async () => {
    const designA = createDutyDesign({
      id: "design-a",
      code: "DESIGN_A",
      label: "Design A"
    });
    const designB = createDutyDesign({
      id: "design-b",
      code: "DESIGN_B",
      label: "Design B",
      dutyBlocks: [
        {
          shiftTypeId: "shift-type-day",
          doctorCount: 1,
          followUpDutyDesignId: "design-a"
        }
      ]
    });
    const serviceWithAssignment = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository([designA]),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository([
        createAssignment()
      ]),
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        createShiftType()
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        createLocation()
      ]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });
    const serviceWithFollowUp = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository([designA, designB]),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        createShiftType()
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        createLocation()
      ]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });
    const auditLogServiceWithSnapshot = createRecordingAuditLogService();
    const serviceWithSnapshot = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository([designA]),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([
        createShiftType()
      ]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([
        createLocation()
      ]),
      rosterSnapshotRepository: createRosterSnapshotRepositoryWithSeed([
        createRosterSnapshotReferencingDutyDesign(designA)
      ]),
      auditLogService: auditLogServiceWithSnapshot
    });

    await expect(
      serviceWithAssignment.deleteDutyDesign({
        id: "design-a",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(EntityInUseError);
    await expect(
      serviceWithFollowUp.deleteDutyDesign({
        id: "design-a",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(EntityInUseError);
    await expect(
      serviceWithSnapshot.deleteDutyDesign({
        id: "design-a",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(EntityInUseError);
    expect(await auditLogServiceWithSnapshot.listLogs()).toEqual([
      expect.objectContaining({
        actionType: "DUTY_DESIGN_DELETE_BLOCKED",
        entityType: "DUTY_DESIGN",
        entityId: "design-a"
      })
    ]);
  });

  it("writes audit entries for duty design update and delete", async () => {
    const dutyDesignRepository = new InMemoryDutyDesignRepository([
      createDutyDesign()
    ]);
    const auditLogService = createRecordingAuditLogService();
    const service = createDutyDesignManagementService({
      dutyDesignRepository,
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([createShiftType()]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([createLocation()]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService
    });

    const updatedDutyDesign = await service.updateDutyDesign({
      id: "design-a",
      code: "DESIGN_A",
      label: "Design A Updated",
      description: "Updated description",
      isActive: true,
      isHolidayDesign: false,
      dutyBlocks: [
        {
          shiftTypeId: "shift-type-day",
          locationId: "location-ccu",
          doctorCount: 2
        }
      ],
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });
    await service.deleteDutyDesign({
      id: updatedDutyDesign.id,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(await auditLogService.listLogs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "DUTY_DESIGN_UPDATED",
          entityId: updatedDutyDesign.id
        }),
        expect.objectContaining({
          actionType: "DUTY_DESIGN_DELETED",
          entityId: updatedDutyDesign.id
        })
      ])
    );
  });

  it("rejects non-admin duty design mutations", async () => {
    const service = createDutyDesignManagementService({
      dutyDesignRepository: new InMemoryDutyDesignRepository([createDutyDesign()]),
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      shiftTypeRepository: new InMemoryShiftTypeRepository([createShiftType()]),
      dutyLocationRepository: new InMemoryDutyLocationRepository([createLocation()]),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.createDutyDesign({
        code: "DESIGN_A",
        label: "Design A",
        isActive: true,
        isHolidayDesign: false,
        dutyBlocks: [
          {
            shiftTypeId: "shift-type-day",
            locationId: "location-ccu",
            doctorCount: 1
          }
        ],
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.updateDutyDesign({
        id: "design-a",
        code: "DESIGN_A",
        label: "Design A",
        description: undefined,
        isActive: true,
        isHolidayDesign: false,
        dutyBlocks: [
          {
            shiftTypeId: "shift-type-day",
            locationId: "location-ccu",
            doctorCount: 1
          }
        ],
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.deleteDutyDesign({
        id: "design-a",
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
