import type {
  ActorRole,
  EntityId,
  ISODateTimeString
} from "@/domain/models/primitives";

export type AuditActionType =
  | "DUTY_LOCATION_CREATED"
  | "DUTY_LOCATION_UPDATED"
  | "DUTY_LOCATION_ACTIVATED"
  | "DUTY_LOCATION_DEACTIVATED"
  | "DUTY_LOCATION_DELETED"
  | "DUTY_LOCATION_DELETE_BLOCKED"
  | "BIAS_CRITERIA_CREATED"
  | "BIAS_CRITERIA_UPDATED"
  | "BIAS_CRITERIA_ACTIVATED"
  | "BIAS_CRITERIA_DEACTIVATED"
  | "BIAS_CRITERIA_DELETED"
  | "BIAS_CRITERIA_DELETE_BLOCKED"
  | "ROSTER_GENERATED"
  | "ROSTER_PUBLISHED"
  | "ROSTER_LOCKED"
  | "ROSTER_UNLOCKED"
  | "ROSTER_DELETED"
  | "ROSTER_DELETE_BLOCKED"
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
  | "DOCTOR_UPDATED"
  | "DOCTOR_ACTIVATED"
  | "DOCTOR_DEACTIVATED"
  | "DOCTOR_DELETED"
  | "DOCTOR_DELETE_BLOCKED"
  | "WEEKEND_GROUP_CHANGED"
  | "SHIFT_TYPE_CHANGED"
  | "ADMIN_OVERRIDE";

export type AuditEntityType =
  | "DUTY_LOCATION"
  | "BIAS_CRITERIA"
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
