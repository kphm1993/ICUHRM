import type { DutyLocation, EntityId } from "@/domain/models";

export interface DutyLocationRepository {
  create(location: DutyLocation): Promise<DutyLocation>;
  update(
    id: EntityId,
    changes: Partial<DutyLocation>
  ): Promise<DutyLocation>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<DutyLocation | null>;
  listActive(): Promise<ReadonlyArray<DutyLocation>>;
  listAll(): Promise<ReadonlyArray<DutyLocation>>;
}
