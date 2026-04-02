import type {
  EntityId,
  ISODateTimeString,
  UserRole,
  UserStatus
} from "@/domain/models/primitives";

export interface User {
  readonly id: EntityId;
  readonly role: UserRole;
  readonly uniqueIdentifier: string;
  readonly displayName: string;
  readonly linkedDoctorId?: EntityId;
  readonly status: UserStatus;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

