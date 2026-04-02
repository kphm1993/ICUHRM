import type {
  ActorRole,
  EntityId,
  ISODateTimeString
} from "@/domain/models/primitives";

export type AuditActionType =
  | "ROSTER_GENERATED"
  | "ROSTER_PUBLISHED"
  | "ROSTER_LOCKED"
  | "SHIFT_REASSIGNED"
  | "LEAVE_CREATED"
  | "LEAVE_UPDATED"
  | "LEAVE_DELETED"
  | "BIAS_RESET"
  | "BIAS_ADJUSTED"
  | "EXCHANGE_REQUESTED"
  | "EXCHANGE_ACCEPTED"
  | "EXCHANGE_REJECTED"
  | "EXCHANGE_CANCELLED"
  | "DOCTOR_CREATED"
  | "DOCTOR_DELETED"
  | "WEEKEND_GROUP_CHANGED"
  | "SHIFT_TYPE_CHANGED"
  | "ADMIN_OVERRIDE";

export type AuditEntityType =
  | "ROSTER"
  | "SHIFT"
  | "ASSIGNMENT"
  | "LEAVE"
  | "OFF_REQUEST"
  | "EXCHANGE_REQUEST"
  | "DOCTOR"
  | "SHIFT_TYPE"
  | "BIAS_LEDGER"
  | "AUDIT_LOG"
  | "SYSTEM";

export type AuditLogDetails = Readonly<Record<string, unknown>>;

export interface AuditLog {
  readonly id: EntityId;
  readonly actorId: EntityId;
  readonly actorRole: ActorRole;
  readonly actionType: AuditActionType;
  readonly entityType: AuditEntityType;
  readonly entityId: EntityId;
  readonly details: AuditLogDetails;
  readonly createdAt: ISODateTimeString;
  readonly correlationId?: string;
}

