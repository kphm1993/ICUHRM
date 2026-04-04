import { describe, expect, it, vi } from "vitest";
import type { AuditLog, DutyLocation, RosterSnapshot } from "@/domain/models";
import { DEFAULT_DUTY_LOCATION_ID } from "@/domain/models";
import { LocationInUseError } from "@/domain/repositories";
import type { RosterSnapshotRepository } from "@/domain/repositories";
import { InMemoryBiasCriteriaRepository, InMemoryDutyLocationRepository } from "@/infrastructure/repositories/inMemory";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import { createDutyLocationManagementService } from "@/features/admin/services/dutyLocationManagementService";

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

function createLocation(overrides: Partial<DutyLocation> = {}): DutyLocation {
  return {
    id: overrides.id ?? "location-annex",
    code: overrides.code ?? "ANNEX",
    label: overrides.label ?? "Annex Ward",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

function createSnapshotReferencingLocation(locationId: string): RosterSnapshot {
  return {
    roster: {
      id: "roster-snapshot-1",
      period: {
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      },
      status: "PUBLISHED",
      isDeleted: false,
      createdAt: NOW,
      createdByUserId: "user-admin-demo",
      generatedAt: NOW,
      publishedAt: NOW,
      weekendGroupSchedule: []
    },
    doctorReferences: [],
    shifts: [
      {
        id: "shift-1",
        rosterId: "roster-snapshot-1",
        date: "2026-04-10",
        shiftTypeId: "shift-type-day",
        locationId,
        startTime: "08:00",
        endTime: "20:00",
        type: "DAY",
        category: "WEEKDAY",
        special: "NONE",
        groupEligibility: "ALL",
        definitionSnapshot: {
          shiftTypeId: "shift-type-day",
          locationId,
          code: "DAY",
          label: "Day",
          startTime: "08:00",
          endTime: "20:00"
        },
        createdAt: NOW
      }
    ],
    assignments: [],
    warnings: [],
    validation: {
      isValid: true,
      issues: []
    },
    updatedBias: [],
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
      fallbackLocationId: DEFAULT_DUTY_LOCATION_ID
    }
  };
}

describe("dutyLocationManagementService", () => {
  it("normalizes code and trims label when creating a location", async () => {
    const auditLogService = createAuditLogServiceMock();
    const locationRepository = new InMemoryDutyLocationRepository([
      createLocation({
        id: DEFAULT_DUTY_LOCATION_ID,
        code: "CCU",
        label: "Cardiac Care Unit"
      })
    ]);
    const service = createDutyLocationManagementService({
      dutyLocationRepository: locationRepository,
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService
    });

    const createdLocation = await service.createLocation({
      code: " annex_2 ",
      label: " Annex Two ",
      description: " Secondary duty area ",
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    expect(createdLocation.code).toBe("ANNEX_2");
    expect(createdLocation.label).toBe("Annex Two");
    expect(createdLocation.description).toBe("Secondary duty area");
    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "DUTY_LOCATION_CREATED",
        entityType: "DUTY_LOCATION",
        details: expect.objectContaining({
          code: "ANNEX_2",
          label: "Annex Two",
          isActive: true
        })
      })
    );
  });

  it("blocks delete when a saved roster snapshot still references the location", async () => {
    const auditLogService = createAuditLogServiceMock();
    const location = createLocation();
    const service = createDutyLocationManagementService({
      dutyLocationRepository: new InMemoryDutyLocationRepository([location]),
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([
        createSnapshotReferencingLocation(location.id)
      ]),
      auditLogService
    });

    await expect(
      service.deleteLocation({
        id: location.id,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(LocationInUseError);

    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "DUTY_LOCATION_DELETE_BLOCKED",
        entityType: "DUTY_LOCATION",
        entityId: location.id,
        details: expect.objectContaining({
          message: expect.stringContaining("saved roster snapshot")
        })
      })
    );
  });

  it("blocks deactivation and deletion of the default duty location", async () => {
    const auditLogService = createAuditLogServiceMock();
    const defaultLocation = createLocation({
      id: DEFAULT_DUTY_LOCATION_ID,
      code: "CCU",
      label: "Cardiac Care Unit"
    });
    const service = createDutyLocationManagementService({
      dutyLocationRepository: new InMemoryDutyLocationRepository([defaultLocation]),
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createRosterSnapshotRepositoryMock([]),
      auditLogService
    });

    await expect(
      service.setLocationActive({
        id: defaultLocation.id,
        isActive: false,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toThrow(
      "The default duty location is currently required by roster generation and cannot be disabled or deleted."
    );

    await expect(
      service.deleteLocation({
        id: defaultLocation.id,
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toThrow(
      "The default duty location is currently required by roster generation and cannot be disabled or deleted."
    );
  });
});
