import type { BiasCriteria, EntityId } from "@/domain/models";

export interface BiasCriteriaRepository {
  create(criteria: BiasCriteria): Promise<BiasCriteria>;
  update(
    id: EntityId,
    changes: Partial<BiasCriteria>
  ): Promise<BiasCriteria>;
  delete(id: EntityId): Promise<void>;
  getById(id: EntityId): Promise<BiasCriteria | null>;
  listActive(): Promise<ReadonlyArray<BiasCriteria>>;
  listAll(): Promise<ReadonlyArray<BiasCriteria>>;
  listByLocationId(locationId: EntityId): Promise<ReadonlyArray<BiasCriteria>>;
  listByShiftTypeId(shiftTypeId: EntityId): Promise<ReadonlyArray<BiasCriteria>>;
}
