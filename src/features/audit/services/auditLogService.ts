import type { AuditLog } from "@/domain/models";
import type { AppendAuditLogInput } from "@/domain/audit";
import type { AuditLogRepository } from "@/domain/repositories";

export interface AuditLogFilter {
  readonly entityType?: AuditLog["entityType"];
  readonly entityId?: string;
  readonly actorId?: string;
  readonly actionType?: AuditLog["actionType"];
}

export interface AuditLogService {
  appendLog(entry: AppendAuditLogInput): Promise<AuditLog>;
  listLogs(filter?: AuditLogFilter): Promise<ReadonlyArray<AuditLog>>;
}

export interface AuditLogServiceDependencies {
  readonly auditLogRepository: AuditLogRepository;
}

export function createAuditLogService(
  dependencies: AuditLogServiceDependencies
): AuditLogService {
  return {
    async appendLog(entry) {
      return dependencies.auditLogRepository.append({
        id: crypto.randomUUID(),
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        actionType: entry.actionType,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
        createdAt: new Date().toISOString(),
        correlationId: entry.correlationId
      });
    },
    async listLogs(filter) {
      return dependencies.auditLogRepository.list(filter);
    }
  };
}
