import type {
  AssignmentSource,
  EntityId,
  ISODateTimeString
} from "@/domain/models/primitives";

export interface Assignment {
  readonly id: EntityId;
  readonly rosterId: EntityId;
  readonly shiftId: EntityId;
  readonly assignedDoctorId: EntityId;
  readonly actualDoctorId: EntityId;
  readonly fairnessOwnerDoctorId: EntityId;
  readonly source: AssignmentSource;
  readonly overrideReason?: string;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

