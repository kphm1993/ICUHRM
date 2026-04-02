import type { EntityId, ISODateString, Leave } from "@/domain/models";

export interface LeaveRepositoryFilter {
  readonly doctorId?: EntityId;
  readonly rangeStart?: ISODateString;
  readonly rangeEnd?: ISODateString;
}

export interface LeaveRepository {
  list(filter?: LeaveRepositoryFilter): Promise<ReadonlyArray<Leave>>;
  findById(id: EntityId): Promise<Leave | null>;
  save(leave: Leave): Promise<Leave>;
  delete(id: EntityId): Promise<void>;
}

