import type {
  EntityId,
  ExchangeRequest,
  ExchangeRequestStatus
} from "@/domain/models";
import { notImplemented } from "@/shared/lib/notImplemented";

export interface CreateExchangeRequestInput {
  readonly rosterId: EntityId;
  readonly shiftId: EntityId;
  readonly requestedByDoctorId: EntityId;
  readonly requestedToDoctorId: EntityId;
  readonly note?: string;
}

export interface ExchangeService {
  listExchangeRequests(rosterId: EntityId): Promise<ReadonlyArray<ExchangeRequest>>;
  createExchangeRequest(input: CreateExchangeRequestInput): Promise<ExchangeRequest>;
  respondToExchangeRequest(
    requestId: EntityId,
    status: Extract<ExchangeRequestStatus, "ACCEPTED" | "REJECTED">
  ): Promise<ExchangeRequest>;
  cancelExchangeRequest(requestId: EntityId): Promise<void>;
}

export function createExchangeServicePlaceholder(): ExchangeService {
  return {
    async listExchangeRequests() {
      throw notImplemented("ExchangeService.listExchangeRequests");
    },
    async createExchangeRequest() {
      throw notImplemented("ExchangeService.createExchangeRequest");
    },
    async respondToExchangeRequest() {
      throw notImplemented("ExchangeService.respondToExchangeRequest");
    },
    async cancelExchangeRequest() {
      throw notImplemented("ExchangeService.cancelExchangeRequest");
    }
  };
}

