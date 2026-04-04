import { describe, expect, it, vi } from "vitest";
import type { AuditLog, DoctorGroup } from "@/domain/models";
import { RepositoryConflictError, UnauthorizedError } from "@/domain/repositories";
import { createGroupConstraintTemplateManagementService } from "@/features/roster/services/groupConstraintTemplateManagementService";
import {
  InMemoryDoctorGroupRepository,
  InMemoryGroupConstraintTemplateRepository
} from "@/infrastructure/repositories/inMemory";
import type { AuditLogService } from "@/features/audit/services/auditLogService";

const NOW = "2026-04-20T09:00:00.000Z";

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

function createDoctorGroup(overrides: Partial<DoctorGroup> = {}): DoctorGroup {
  return {
    id: overrides.id ?? "group-a",
    name: overrides.name ?? "Group A",
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW
  };
}

describe("groupConstraintTemplateManagementService", () => {
  it("creates and lists templates with audit logging", async () => {
    const auditLogService = createAuditLogServiceMock();
    const service = createGroupConstraintTemplateManagementService({
      groupConstraintTemplateRepository: new InMemoryGroupConstraintTemplateRepository(),
      doctorGroupRepository: new InMemoryDoctorGroupRepository([createDoctorGroup()]),
      auditLogService
    });

    const createdTemplate = await service.createGroupConstraintTemplate({
      code: " weekday_a ",
      label: " Weekday A ",
      allowedDoctorGroupId: "group-a",
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    expect(createdTemplate.code).toBe("WEEKDAY_A");
    expect(createdTemplate.label).toBe("Weekday A");
    expect(createdTemplate.rules.allowedDoctorGroupId).toBe("group-a");
    await expect(service.listGroupConstraintTemplates()).resolves.toEqual([
      createdTemplate
    ]);
    expect(auditLogService.appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "GROUP_CONSTRAINT_TEMPLATE_CREATED",
        entityType: "GROUP_CONSTRAINT_TEMPLATE",
        entityId: createdTemplate.id,
        details: expect.objectContaining({
          code: "WEEKDAY_A",
          label: "Weekday A",
          allowedDoctorGroupId: "group-a",
          allowedDoctorGroupName: "Group A"
        })
      })
    );
  });

  it("rejects duplicate template codes and non-admin creation", async () => {
    const service = createGroupConstraintTemplateManagementService({
      groupConstraintTemplateRepository: new InMemoryGroupConstraintTemplateRepository(),
      doctorGroupRepository: new InMemoryDoctorGroupRepository([createDoctorGroup()]),
      auditLogService: createAuditLogServiceMock()
    });

    await service.createGroupConstraintTemplate({
      code: "WEEKDAY_A",
      label: "Weekday A",
      allowedDoctorGroupId: "group-a",
      actorId: "user-admin-demo",
      actorRole: "ADMIN"
    });

    await expect(
      service.createGroupConstraintTemplate({
        code: "weekday_a",
        label: "Duplicate",
        allowedDoctorGroupId: "group-a",
        actorId: "user-admin-demo",
        actorRole: "ADMIN"
      })
    ).rejects.toBeInstanceOf(RepositoryConflictError);

    await expect(
      service.createGroupConstraintTemplate({
        code: "NEW_CODE",
        label: "Not Allowed",
        allowedDoctorGroupId: "group-a",
        actorId: "user-doctor-demo",
        actorRole: "DOCTOR"
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
