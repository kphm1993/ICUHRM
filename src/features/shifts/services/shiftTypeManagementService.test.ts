import { describe, expect, it } from "vitest";
import type { AuditLog, DutyDesign, ShiftType } from "@/domain/models";
import type { RosterSnapshotRepository } from "@/domain/repositories";
import { EntityInUseError, UnauthorizedError } from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  InMemoryBiasCriteriaRepository,
  InMemoryDutyDesignRepository,
  InMemoryShiftTypeRepository
} from "@/infrastructure/repositories/inMemory";
import { createShiftTypeManagementService } from "@/features/shifts/services/shiftTypeManagementService";
import { ShiftTypeValidationError } from "@/features/shifts/services/shiftTypeManagementValidation";

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

function createEmptyRosterSnapshotRepository(): RosterSnapshotRepository {
  return {
    list: async () => [],
    findById: async () => null,
    save: async (snapshot) => snapshot
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

function createDutyDesign(overrides: Partial<DutyDesign> = {}): DutyDesign {
  return {
    id: overrides.id ?? "design-weekday",
    code: overrides.code ?? "WEEKDAY",
    label: overrides.label ?? "Weekday Design",
    description: overrides.description,
    isActive: overrides.isActive ?? true,
    isHolidayDesign: overrides.isHolidayDesign ?? false,
    dutyBlocks: overrides.dutyBlocks ?? [
      {
        shiftTypeId: "shift-type-day",
        doctorCount: 1
      }
    ],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("shiftTypeManagementService", () => {
  it("creates overnight shift types and normalizes code and label", async () => {
    const auditLogService = createRecordingAuditLogService();
    const service = createShiftTypeManagementService({
      shiftTypeRepository: new InMemoryShiftTypeRepository(),
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService
    });

    const shiftType = await service.createShiftType({
      code: " night ",
      label: " Night Shift ",
      startTime: "20:00",
      endTime: "08:00",
      category: "NIGHT",
      isActive: true,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(shiftType.code).toBe("NIGHT");
    expect(shiftType.label).toBe("Night Shift");
    expect(shiftType.category).toBe("NIGHT");
    expect(await auditLogService.listLogs()).toEqual([
      expect.objectContaining({
        actionType: "SHIFT_TYPE_CREATED",
        entityType: "SHIFT_TYPE",
        entityId: shiftType.id
      })
    ]);
  });

  it("blocks delete when a duty design references the shift type", async () => {
    const shiftTypeRepository = new InMemoryShiftTypeRepository([
      createShiftType()
    ]);
    const dutyDesignRepository = new InMemoryDutyDesignRepository([
      createDutyDesign()
    ]);
    const auditLogService = createRecordingAuditLogService();
    const service = createShiftTypeManagementService({
      shiftTypeRepository,
      dutyDesignRepository,
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService
    });

    await expect(
      service.deleteShiftType({
        id: "shift-type-day",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(EntityInUseError);
    expect(await auditLogService.listLogs()).toEqual([
      expect.objectContaining({
        actionType: "SHIFT_TYPE_DELETE_BLOCKED",
        entityType: "SHIFT_TYPE",
        entityId: "shift-type-day"
      })
    ]);
  });

  it("rejects invalid time ranges where start and end are the same", async () => {
    const service = createShiftTypeManagementService({
      shiftTypeRepository: new InMemoryShiftTypeRepository(),
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.createShiftType({
        code: "DAY",
        label: "Day",
        startTime: "08:00",
        endTime: "08:00",
        category: "DAY",
        isActive: true,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(ShiftTypeValidationError);
  });

  it("writes audit entries for shift type update and delete", async () => {
    const shiftTypeRepository = new InMemoryShiftTypeRepository([createShiftType()]);
    const auditLogService = createRecordingAuditLogService();
    const service = createShiftTypeManagementService({
      shiftTypeRepository,
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService
    });

    const updatedShiftType = await service.updateShiftType({
      id: "shift-type-day",
      code: "DAY",
      label: "Day Updated",
      startTime: "09:00",
      endTime: "21:00",
      category: "DAY",
      isActive: true,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });
    await service.deleteShiftType({
      id: updatedShiftType.id,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(await auditLogService.listLogs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "SHIFT_TYPE_UPDATED",
          entityId: updatedShiftType.id
        }),
        expect.objectContaining({
          actionType: "SHIFT_TYPE_DELETED",
          entityId: updatedShiftType.id
        })
      ])
    );
  });

  it("rejects non-admin shift type mutations", async () => {
    const service = createShiftTypeManagementService({
      shiftTypeRepository: new InMemoryShiftTypeRepository([createShiftType()]),
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      biasCriteriaRepository: new InMemoryBiasCriteriaRepository(),
      rosterSnapshotRepository: createEmptyRosterSnapshotRepository(),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.createShiftType({
        code: "DAY",
        label: "Day",
        startTime: "08:00",
        endTime: "20:00",
        category: "DAY",
        isActive: true,
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.updateShiftType({
        id: "shift-type-day",
        code: "DAY",
        label: "Day",
        startTime: "08:00",
        endTime: "20:00",
        category: "DAY",
        isActive: true,
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.deleteShiftType({
        id: "shift-type-day",
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
