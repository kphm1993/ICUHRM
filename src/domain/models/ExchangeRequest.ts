import type {
  EntityId,
  ExchangeRequestStatus,
  ISODateTimeString
} from "@/domain/models/primitives";

export interface ExchangeRequest {
  readonly id: EntityId;
  readonly rosterId: EntityId;
  readonly shiftId: EntityId;
  readonly requestedByDoctorId: EntityId;
  readonly requestedToDoctorId: EntityId;
  readonly status: ExchangeRequestStatus;
  readonly note?: string;
  readonly createdAt: ISODateTimeString;
  readonly respondedAt?: ISODateTimeString;
  readonly respondedByUserId?: EntityId;
}

