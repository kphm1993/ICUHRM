import type {
  EntityId,
  ExchangeRequest,
  ExchangeRequestStatus
} from "@/domain/models";

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

// TODO: Implement exchange functionality
export const exchangeService: ExchangeService = {
  async listExchangeRequests() {
    throw new Error("Exchange functionality not yet implemented");
  },
  async createExchangeRequest() {
    throw new Error("Exchange functionality not yet implemented");
  },
  async respondToExchangeRequest() {
    throw new Error("Exchange functionality not yet implemented");
  },
  async cancelExchangeRequest() {
    throw new Error("Exchange functionality not yet implemented");
  }
};

