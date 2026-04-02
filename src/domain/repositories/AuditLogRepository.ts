import type {
  AuditLog,
  AuditActionType,
  AuditEntityType,
  EntityId
} from "@/domain/models";

export interface AuditLogRepositoryFilter {
  readonly entityType?: AuditEntityType;
  readonly entityId?: EntityId;
  readonly actorId?: EntityId;
  readonly actionType?: AuditActionType;
}

export interface AuditLogRepository {
  list(filter?: AuditLogRepositoryFilter): Promise<ReadonlyArray<AuditLog>>;
  append(log: AuditLog): Promise<AuditLog>;
}
