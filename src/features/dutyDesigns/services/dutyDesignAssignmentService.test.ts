import { describe, expect, it } from "vitest";
import type { AuditLog, DutyDesign } from "@/domain/models";
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
  UnauthorizedError
} from "@/domain/repositories";
import type { AuditLogService } from "@/features/audit/services/auditLogService";
import {
  InMemoryDutyDesignAssignmentRepository,
  InMemoryDutyDesignRepository
} from "@/infrastructure/repositories/inMemory";
import { createDutyDesignAssignmentService } from "@/features/dutyDesigns/services/dutyDesignAssignmentService";

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

function createAssignment(overrides: {
  readonly id?: string;
  readonly date?: string;
  readonly dutyDesignId?: string;
  readonly isHolidayOverride?: boolean;
} = {}) {
  return {
    id: overrides.id ?? "assignment-1",
    date: overrides.date ?? "2026-04-10",
    dutyDesignId: overrides.dutyDesignId ?? "design-weekday",
    isHolidayOverride: overrides.isHolidayOverride ?? false,
    createdAt: NOW,
    updatedAt: NOW
  };
}

describe("dutyDesignAssignmentService", () => {
  it("assigns, lists, and unassigns duty designs by month", async () => {
    const auditLogService = createRecordingAuditLogService();
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      dutyDesignRepository: new InMemoryDutyDesignRepository([
        createDutyDesign()
      ]),
      auditLogService
    });

    const assignment = await service.assignDutyDesign({
      date: "2026-04-10",
      dutyDesignId: "design-weekday",
      isHolidayOverride: true,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(
      await service.listAssignmentsByMonth({
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      })
    ).toEqual([assignment]);

    await service.unassignDutyDesign({
      assignmentId: assignment.id,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(
      await service.listAssignmentsByMonth({
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      })
    ).toEqual([]);
    expect(await auditLogService.listLogs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "DUTY_DESIGN_ASSIGNED",
          entityType: "DUTY_DESIGN_ASSIGNMENT",
          entityId: assignment.id
        }),
        expect.objectContaining({
          actionType: "DUTY_DESIGN_UNASSIGNED",
          entityType: "DUTY_DESIGN_ASSIGNMENT",
          entityId: assignment.id
        })
      ])
    );
  });

  it("allows one standard and one holiday override assignment on the same date", async () => {
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      dutyDesignRepository: new InMemoryDutyDesignRepository([
        createDutyDesign(),
        createDutyDesign({
          id: "design-holiday",
          code: "HOLIDAY",
          label: "Holiday Design"
        })
      ]),
      auditLogService: createRecordingAuditLogService()
    });

    await service.assignDutyDesign({
      date: "2026-04-10",
      dutyDesignId: "design-weekday",
      isHolidayOverride: false,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });
    await service.assignDutyDesign({
      date: "2026-04-10",
      dutyDesignId: "design-holiday",
      isHolidayOverride: true,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    await expect(
      service.listAssignmentsByMonth({
        startDate: "2026-04-01",
        endDate: "2026-04-30"
      })
    ).resolves.toHaveLength(2);
  });

  it("rejects assignments for missing duty designs", async () => {
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      dutyDesignRepository: new InMemoryDutyDesignRepository(),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.assignDutyDesign({
        date: "2026-04-10",
        dutyDesignId: "missing-design",
        isHolidayOverride: false,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("rejects unassign for missing assignments", async () => {
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository(),
      dutyDesignRepository: new InMemoryDutyDesignRepository([
        createDutyDesign()
      ]),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.unassignDutyDesign({
        assignmentId: "missing-assignment",
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("updates assignments and writes an updated audit entry", async () => {
    const auditLogService = createRecordingAuditLogService();
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository([
        createAssignment()
      ]),
      dutyDesignRepository: new InMemoryDutyDesignRepository([
        createDutyDesign(),
        createDutyDesign({
          id: "design-holiday",
          code: "HOLIDAY",
          label: "Holiday Design"
        })
      ]),
      auditLogService
    });

    const updatedAssignment = await service.updateDutyDesignAssignment({
      assignmentId: "assignment-1",
      date: "2026-04-11",
      dutyDesignId: "design-holiday",
      isHolidayOverride: true,
      actorId: ACTOR_ID,
      actorRole: ACTOR_ROLE
    });

    expect(updatedAssignment).toMatchObject({
      id: "assignment-1",
      date: "2026-04-11",
      dutyDesignId: "design-holiday",
      isHolidayOverride: true
    });
    expect(await auditLogService.listLogs()).toEqual([
      expect.objectContaining({
        actionType: "DUTY_DESIGN_ASSIGNMENT_UPDATED",
        entityType: "DUTY_DESIGN_ASSIGNMENT",
        entityId: "assignment-1"
      })
    ]);
  });

  it("rejects non-admin assignment mutations", async () => {
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository([
        createAssignment()
      ]),
      dutyDesignRepository: new InMemoryDutyDesignRepository([
        createDutyDesign()
      ]),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.assignDutyDesign({
        date: "2026-04-10",
        dutyDesignId: "design-weekday",
        isHolidayOverride: false,
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.updateDutyDesignAssignment({
        assignmentId: "assignment-1",
        date: "2026-04-11",
        dutyDesignId: "design-weekday",
        isHolidayOverride: false,
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.unassignDutyDesign({
        assignmentId: "assignment-1",
        actorId: ACTOR_ID,
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("re-runs uniqueness validation during assignment updates", async () => {
    const service = createDutyDesignAssignmentService({
      dutyDesignAssignmentRepository: new InMemoryDutyDesignAssignmentRepository([
        createAssignment({
          id: "assignment-1",
          date: "2026-04-10",
          dutyDesignId: "design-weekday",
          isHolidayOverride: false
        }),
        createAssignment({
          id: "assignment-2",
          date: "2026-04-11",
          dutyDesignId: "design-holiday",
          isHolidayOverride: false
        })
      ]),
      dutyDesignRepository: new InMemoryDutyDesignRepository([
        createDutyDesign(),
        createDutyDesign({
          id: "design-holiday",
          code: "HOLIDAY",
          label: "Holiday Design"
        })
      ]),
      auditLogService: createRecordingAuditLogService()
    });

    await expect(
      service.updateDutyDesignAssignment({
        assignmentId: "assignment-1",
        date: "2026-04-11",
        dutyDesignId: "design-weekday",
        isHolidayOverride: false,
        actorId: ACTOR_ID,
        actorRole: ACTOR_ROLE
      })
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });
});
