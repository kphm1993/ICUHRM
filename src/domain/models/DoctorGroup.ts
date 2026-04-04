import type { EntityId, ISODateTimeString } from "@/domain/models/primitives";

export interface DoctorGroup {
  readonly id: EntityId;
  readonly name: string;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}
