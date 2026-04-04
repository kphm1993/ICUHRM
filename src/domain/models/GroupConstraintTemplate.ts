import type { EntityId, ISODateTimeString } from "@/domain/models/primitives";

export interface GroupConstraintTemplate {
  readonly id: EntityId;
  readonly code: string;
  readonly label: string;
  readonly rules: {
    readonly allowedDoctorGroupId: EntityId;
  };
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
