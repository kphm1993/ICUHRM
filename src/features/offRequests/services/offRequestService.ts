import type {
  EntityId,
  OffRequest,
  OffRequestShiftPreference,
  PriorityLevel,
  YearMonthString
} from "@/domain/models";
import { notImplemented } from "@/shared/lib/notImplemented";

export interface SubmitOffRequestInput {
  readonly doctorId: EntityId;
  readonly rosterMonth: YearMonthString;
  readonly date: string;
  readonly shiftPreference: OffRequestShiftPreference;
  readonly priority: PriorityLevel;
}

export interface OffRequestService {
  listRequests(rosterMonth: YearMonthString): Promise<ReadonlyArray<OffRequest>>;
  submitRequest(input: SubmitOffRequestInput): Promise<OffRequest>;
  cancelRequest(requestId: EntityId): Promise<void>;
}

export function createOffRequestServicePlaceholder(): OffRequestService {
  return {
    async listRequests() {
      throw notImplemented("OffRequestService.listRequests");
    },
    async submitRequest() {
      throw notImplemented("OffRequestService.submitRequest");
    },
    async cancelRequest() {
      throw notImplemented("OffRequestService.cancelRequest");
    }
  };
}

