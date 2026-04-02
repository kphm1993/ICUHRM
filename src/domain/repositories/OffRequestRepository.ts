import type {
  EntityId,
  OffRequest,
  YearMonthString
} from "@/domain/models";

export interface OffRequestRepositoryFilter {
  readonly rosterMonth?: YearMonthString;
  readonly doctorId?: EntityId;
}

export interface OffRequestRepository {
  list(filter?: OffRequestRepositoryFilter): Promise<ReadonlyArray<OffRequest>>;
  findById(id: EntityId): Promise<OffRequest | null>;
  save(request: OffRequest): Promise<OffRequest>;
  delete(id: EntityId): Promise<void>;
}
