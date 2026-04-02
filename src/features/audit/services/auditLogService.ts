import type { AuditLog } from "@/domain/models";
import type { AppendAuditLogInput } from "@/domain/audit";
import { notImplemented } from "@/shared/lib/notImplemented";

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

export function createAuditLogServicePlaceholder(): AuditLogService {
  return {
    async appendLog() {
      throw notImplemented("AuditLogService.appendLog");
    },
    async listLogs() {
      throw notImplemented("AuditLogService.listLogs");
    }
  };
}
