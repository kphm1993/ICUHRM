import type { AuditLog } from "@/domain/models/AuditLog";
import type { AuditEntityType, AuditLogDetails } from "@/domain/models/AuditLog";
import type { ActorRole, EntityId } from "@/domain/models/primitives";
import type { AuditActionType } from "@/domain/models/AuditLog";

export interface AppendAuditLogInput {
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
  readonly actionType: AuditActionType;
  readonly entityType: AuditEntityType;
  readonly entityId: EntityId;
  readonly details: AuditLogDetails;
  readonly correlationId?: string;
}

export interface AuditLogger {
  append(entry: AppendAuditLogInput): Promise<AuditLog>;
}

